#!/usr/bin/env bash
set -euo pipefail

# 日历 H5 发版：构建 → 打包 → 上传 → 服务器原子切换 → 健康检查
#
# 用法:
#   scripts/release-h5.sh                构建并发布到 /var/www/calendar
#   scripts/release-h5.sh --skip-build   跳过构建，直接发布现有 unpackage/dist/build/web
#   scripts/release-h5.sh --dry-run      只构建/上传/解压校验，不改线上目录
#
# 可覆盖的环境变量:
#   INSTANCE_ID / REGION / SERVER_DIR / PORT / PUBLIC_URL / WORKBENCH / HBX_APP

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HBX_APP="${HBX_APP:-/Applications/HBuilderX.app}"
HBX_CLI_DIR="$HBX_APP/Contents/HBuilderX/plugins/uniapp-cli-vite"
HBX_NODE="$HBX_APP/Contents/HBuilderX/plugins/node/node"
HBX_PLUGINS="$HBX_APP/Contents/HBuilderX/plugins"
INSTANCE_ID="${INSTANCE_ID:-i-bp111q3by9qb4llq33lc}"
REGION="${REGION:-cn-hangzhou}"
SERVER_DIR="${SERVER_DIR:-/var/www/calendar}"
PORT="${PORT:-923}"
PUBLIC_URL="${PUBLIC_URL:-http://112.124.7.78:$PORT/}"
WORKBENCH="${WORKBENCH:-$HOME/.local/bin/workbench}"
BUILD_DIR="$ROOT_DIR/unpackage/dist/build/web"

SKIP_BUILD=false
DRY_RUN=false

for arg in "$@"; do
	case "$arg" in
		--skip-build) SKIP_BUILD=true ;;
		--dry-run) DRY_RUN=true ;;
		--help | -h)
			sed -n '4,12p' "$0"
			exit 0
			;;
		*)
			echo "未知参数: $arg（可用 --skip-build / --dry-run）" >&2
			exit 1
			;;
	esac
done

log() {
	printf '\033[1;34m[release]\033[0m %s\n' "$*"
}

fail() {
	printf '\033[1;31m[release] %s\033[0m\n' "$*" >&2
	exit 1
}

[ -x "$WORKBENCH" ] || fail "未找到 workbench CLI: $WORKBENCH"

# 1. 构建 H5（使用 HBuilderX 内置 uni-app 编译器，无需 CLI 登录）
if [ "$SKIP_BUILD" = false ]; then
	[ -x "$HBX_NODE" ] || fail "未找到 HBuilderX 内置 Node: $HBX_NODE"
	[ -d "$HBX_CLI_DIR" ] || fail "未找到 HBuilderX uni-app 编译器: $HBX_CLI_DIR"

	HX_VERSION="${HX_VERSION:-$(
		/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' \
			"$HBX_APP/Contents/Info.plist" 2>/dev/null || echo 5.34
	)}"

	# 发版必升版本号：versionName patch+1，versionCode+1
	MANIFEST="$ROOT_DIR/manifest.json"
	[ -f "$MANIFEST" ] || fail "未找到 manifest.json: $MANIFEST"
	CUR_NAME="$(sed -n 's/.*"versionName"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$MANIFEST" | head -1)"
	CUR_CODE="$(sed -n -E 's/.*"versionCode"[[:space:]]*:[[:space:]]*"?([0-9]+)"?.*/\1/p' "$MANIFEST" | head -1)"
	[ -n "$CUR_NAME" ] || fail "manifest.json 缺少 versionName"
	[ -n "$CUR_CODE" ] || fail "manifest.json 缺少 versionCode"
	CUR_PATCH="${CUR_NAME##*.}"
	case "$CUR_PATCH" in
		'' | *[!0-9]*)
			fail "versionName 格式不支持: $CUR_NAME（需 x.y.z）"
			;;
	esac
	NEW_NAME="${CUR_NAME%.*}.$((CUR_PATCH + 1))"
	NEW_CODE=$((CUR_CODE + 1))
	sed -i '' -E "s/\"versionName\"([[:space:]]*:[[:space:]]*)\"[^\"]*\"/\"versionName\"\1\"$NEW_NAME\"/" "$MANIFEST"
	sed -i '' -E "s/\"versionCode\"([[:space:]]*:[[:space:]]*)\"?[0-9]+\"?/\"versionCode\"\1\"$NEW_CODE\"/" "$MANIFEST"
	grep -q "\"versionName\" *: *\"$NEW_NAME\"" "$MANIFEST" || fail "versionName 更新失败"
	grep -q "\"versionCode\" *: *\"$NEW_CODE\"" "$MANIFEST" || fail "versionCode 更新失败"
	log "版本号: $CUR_NAME → $NEW_NAME（versionCode $CUR_CODE → $NEW_CODE），发布后记得提交 manifest.json"

	log "构建 H5 生产包..."
	(
		cd "$HBX_CLI_DIR"
		NODE_ENV=production \
			UNI_PLATFORM=h5 \
			UNI_INPUT_DIR="$ROOT_DIR" \
			UNI_OUTPUT_DIR="$BUILD_DIR" \
			UNI_CLI_CONTEXT="$HBX_CLI_DIR" \
			UNI_HBUILDERX_PLUGINS="$HBX_PLUGINS" \
			RUN_BY_HBUILDERX=1 \
			HX_Version="$HX_VERSION" \
			"$HBX_NODE" node_modules/@dcloudio/vite-plugin-uni/bin/uni.js build
	)
else
	log "跳过构建，使用现有产物（版本号不变）"
fi

[ -f "$BUILD_DIR/index.html" ] || fail "构建产物不存在: $BUILD_DIR/index.html"
log "构建产物大小: $(du -sh "$BUILD_DIR" | awk '{print $1}')"

# 2. 打包
STAMP="$(date +%Y%m%d%H%M%S)"
TMP_DIR="$(mktemp -d)"
TARBALL="$TMP_DIR/calendar-h5-$STAMP.tar.gz"
trap 'rm -rf "$TMP_DIR"' EXIT

COPYFILE_DISABLE=1 tar --no-xattrs -czf "$TARBALL" -C "$BUILD_DIR" .
log "打包完成: $(du -sh "$TARBALL" | awk '{print $1}')"

# 3. 上传
REMOTE_TAR="/tmp/calendar-h5-$STAMP.tar.gz"
log "上传到服务器 /tmp ..."
"$WORKBENCH" upload "$TARBALL" "$REMOTE_TAR" \
	--instance-id "$INSTANCE_ID" --region "$REGION" --force

# 4. dry-run：只解压到 /tmp 校验
if [ "$DRY_RUN" = true ]; then
	log "dry-run：解压到服务器临时目录校验，不改动 $SERVER_DIR"
	"$WORKBENCH" exec \
		--instance-id "$INSTANCE_ID" --region "$REGION" \
		--command "set -e
rm -rf /tmp/calendar-h5-check
mkdir -p /tmp/calendar-h5-check
tar -xzf '$REMOTE_TAR' -C /tmp/calendar-h5-check
test -f /tmp/calendar-h5-check/index.html
du -sh /tmp/calendar-h5-check
rm -rf /tmp/calendar-h5-check '$REMOTE_TAR'"
	log "dry-run 完成，未发布"
	exit 0
fi

# 5. 备份 + 原子切换（先解压到临时目录，再整体 mv）
BACKUP_DIR="/var/www/calendar.bak-$STAMP"
STAGE_DIR="/var/www/.calendar-stage-$STAMP"
log "备份并发布到 $SERVER_DIR ..."
"$WORKBENCH" exec \
	--instance-id "$INSTANCE_ID" --region "$REGION" \
	--command "set -e
rm -rf '$STAGE_DIR'
mkdir -p '$STAGE_DIR'
tar -xzf '$REMOTE_TAR' -C '$STAGE_DIR'
test -f '$STAGE_DIR/index.html'
chown -R root:root '$STAGE_DIR'
find '$STAGE_DIR' -type d -exec chmod 755 {} \\;
find '$STAGE_DIR' -type f -exec chmod 644 {} \\;
if [ -d '$SERVER_DIR' ]; then mv '$SERVER_DIR' '$BACKUP_DIR'; fi
if ! mv '$STAGE_DIR' '$SERVER_DIR'; then
  if [ -d '$BACKUP_DIR' ]; then mv '$BACKUP_DIR' '$SERVER_DIR'; fi
  exit 1
fi
rm -f '$REMOTE_TAR'
echo '已备份到: $BACKUP_DIR'
du -sh '$SERVER_DIR'"

# 6. 健康检查
log "健康检查 $PUBLIC_URL ..."
HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$PUBLIC_URL" || true)"
[ "$HTTP_CODE" = "200" ] || fail "线上检查失败: HTTP $HTTP_CODE（备份保留在 $BACKUP_DIR）"
log "发布成功: $PUBLIC_URL"
