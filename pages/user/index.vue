<template>
	<view class="user-page" :class="[pageThemeClass, { 'user-dark': isDark }]">
		<!-- 头部 -->
		<view class="user-head" :style="headStyle">
			<text class="head-back" @tap="goBack">‹</text>
			<text class="head-title">我的</text>
			<view class="head-spacer"></view>
		</view>

		<!-- ====== 用户信息卡片 ====== -->
		<view class="card user-card">
			<view class="avatar">{{ userInitial }}</view>
			<view class="user-info">
				<text class="user-name">{{ userName }}</text>
				<text class="user-id">ID: {{ userId }}</text>
				<view v-if="identityTag || gender" class="user-tags">
					<text v-if="identityTag" class="user-tag">{{
						identityTag
					}}</text>
					<text v-if="gender" class="user-tag">{{ gender }}</text>
				</view>
			</view>
		</view>

		<!-- ====== 个人资料 ====== -->
		<view class="section-title">个人资料</view>
		<view class="card profile-card">
			<view class="profile-row" @tap="openEditProfile">
				<text class="profile-label">身份标签</text>
				<view class="profile-value-wrap">
					<text class="profile-value" :class="{ 'profile-value--empty': !identityTag }">
						{{ identityTag || "未设置" }}
					</text>
					<text class="profile-arrow">›</text>
				</view>
			</view>
			<view class="profile-divider"></view>
			<view class="profile-row" @tap="openEditProfile">
				<text class="profile-label">性别</text>
				<view class="profile-value-wrap">
					<text class="profile-value" :class="{ 'profile-value--empty': !gender }">
						{{ gender || "未设置" }}
					</text>
					<text class="profile-arrow">›</text>
				</view>
			</view>
		</view>

		<!-- ====== 绑定管理 ====== -->
		<view class="section-title">伴侣绑定</view>

		<!-- 已绑定的用户 -->
		<view v-if="activeBindings.length" class="card-list">
			<view v-for="b in activeBindings" :key="b.id" class="card bind-card">
				<view class="bind-info">
					<view class="bind-name-row">
						<text class="bind-name">{{ partnerName(b) }}</text>
						<text v-if="partnerGender(b)" class="bind-gender-tag">{{
							partnerGender(b)
						}}</text>
					</view>
					<text class="bind-date">绑定于 {{ formatDate(b.bound_at) }}</text>
				</view>
				<text class="unbind-btn" @tap="handleUnbind(b)">解绑</text>
			</view>
		</view>

		<!-- 空状态单独展示，避免用户在没有任何绑定数据时看到一大片留白 -->
		<view v-if="!activeBindings.length && !incomingRequests.length && !outgoingRequests.length"
			class="card bind-empty-card">
			<text class="bind-empty-title">还没有绑定关系</text>
			<text class="bind-empty-desc">输入对方用户 ID，发送申请后等待对方确认即可</text>
		</view>

		<!-- 待审批的申请（收到的） -->
		<view v-if="incomingRequests.length" class="section-title">收到的申请</view>
		<view v-if="incomingRequests.length" class="card-list">
			<view v-for="b in incomingRequests" :key="b.id" class="card bind-card">
				<view class="bind-info">
					<view class="bind-name-row">
						<text class="bind-name">{{ partnerName(b) }}</text>
						<text v-if="partnerGender(b)" class="bind-gender-tag">{{
							partnerGender(b)
						}}</text>
					</view>
					<text class="bind-date">请求与你绑定</text>
				</view>
				<view class="bind-actions">
					<text class="accept-btn" @tap="handleAccept(b)">同意</text>
				</view>
			</view>
		</view>

		<!-- 已发出的申请 -->
		<view v-if="outgoingRequests.length" class="section-title">发出的申请</view>
		<view v-if="outgoingRequests.length" class="card-list">
			<view v-for="b in outgoingRequests" :key="b.id" class="card bind-card">
				<view class="bind-info">
					<view class="bind-name-row">
						<text class="bind-name">{{ partnerName(b) }}</text>
						<text v-if="partnerGender(b)" class="bind-gender-tag">{{
							partnerGender(b)
						}}</text>
					</view>
					<text class="bind-date">等待对方同意</text>
				</view>
			</view>
		</view>

		<!-- ====== 发起绑定 ====== -->
		<view class="section-title">发起绑定</view>
		<view class="card apply-card">
			<view class="apply-row">
				<input class="apply-input" v-model="targetUserId" type="number" placeholder="输入对方用户 ID" />
				<text class="apply-btn" @tap="handleApply">发送申请</text>
			</view>
			<text class="apply-hint">发送后需要等待对方同意，关系建立后会显示在上方列表</text>
		</view>

		<!-- ====== 退出 ====== -->
		<view class="logout-btn" @tap="handleLogout">
			<text>退出登录</text>
		</view>

		<!-- ====== 编辑资料弹窗 ====== -->
		<view v-if="showEditProfile" class="profile-mask" @tap="closeEditProfile">
			<view class="profile-modal" @tap.stop>
				<text class="modal-title">修改个人资料</text>

				<!-- 身份标签 -->
				<text class="modal-label">身份标签</text>
				<input class="modal-input" v-model="editIdentityTag" placeholder="输入身份标签（可留空）" :maxlength="20" />

				<!-- 性别 -->
				<text class="modal-label">性别</text>
				<view class="modal-gender-row">
					<text class="gender-tag" :class="{ 'gender-tag--active': editGender === '男' }"
						@tap="editGender = editGender === '男' ? '' : '男'">男</text>
					<text class="gender-tag" :class="{ 'gender-tag--active': editGender === '女' }"
						@tap="editGender = editGender === '女' ? '' : '女'">女</text>
					<text class="gender-tag" :class="{ 'gender-tag--active': editGender === '' }"
						@tap="editGender = ''">不设置</text>
				</view>

				<!-- 按钮 -->
				<view class="modal-btns">
					<text class="modal-btn modal-btn--cancel" @tap="closeEditProfile">取消</text>
					<text class="modal-btn modal-btn--save" @tap="handleSaveProfile">保存</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { getUser, logout, updateUserFields } from "@/store/auth.js";
import { getTheme } from "@/store/theme.js";
import { resolveProfileThemeClass } from "@/store/profile-theme.js";
import {
	getBindings,
	applyBinding,
	acceptBinding,
	unbindBinding,
} from "@/api/binding.js";
import { updateProfile } from "@/api/auth.js";

const isDark = ref(getTheme() === "dark");
const user = getUser() || {};
const userId = user.id || 0;
const userName = user.username || "未登录";
const userInitial = computed(() => (userName[0] || "U").toUpperCase());

/* ---- 身份标签 & 性别（响应式） ---- */
const identityTag = ref(user.identity_tag || "");
const gender = ref(user.gender || "");

/* ---- 页面主题 ---- */
const pageThemeClass = computed(() => {
	/* user 页内修改性别后需要立即切换主题，因此这里直接基于响应式 gender 计算 */
	return resolveProfileThemeClass(gender.value);
});

/* ---- 编辑弹窗状态 ---- */
const showEditProfile = ref(false);
const editIdentityTag = ref("");
const editGender = ref("");

function openEditProfile() {
	editIdentityTag.value = identityTag.value;
	editGender.value = gender.value;
	showEditProfile.value = true;
}

function closeEditProfile() {
	showEditProfile.value = false;
}

async function handleSaveProfile() {
	try {
		await updateProfile(userId, {
			identity_tag: editIdentityTag.value.trim(),
			gender: editGender.value,
		});
		// 同步本地存储 & 页面状态
		identityTag.value = editIdentityTag.value.trim();
		gender.value = editGender.value;
		updateUserFields({
			identity_tag: identityTag.value,
			gender: gender.value,
		});
		showEditProfile.value = false;
		uni.showToast({ title: "修改成功", icon: "success" });
	} catch (_) {
		// 错误已在 request 层提示
	}
}

const targetUserId = ref("");
const bindings = ref([]);

/* ---- 状态栏 & 胶囊按钮适配（微信 / APK 兼容） ---- */
const headStyle = computed(() => {
	const sys = uni.getSystemInfoSync();
	const statusBarHeight = sys.statusBarHeight || 0;
	try {
		// #ifdef MP-WEIXIN
		const menu = uni.getMenuButtonBoundingClientRect();
		if (menu && menu.bottom) {
			const navHeight = menu.bottom + 8;
			const padRight = sys.windowWidth - menu.left + 12;
			return {
				paddingTop: statusBarHeight + "px",
				height: navHeight - statusBarHeight + "px",
				lineHeight: menu.height + "px",
				paddingLeft: "20px",
				paddingRight: padRight + "px",
			};
		}
		// #endif
		// APK / H5 回退
		return {
			paddingTop: statusBarHeight + "px",
			height: "44px",
			lineHeight: "44px",
			paddingLeft: "20px",
			paddingRight: "20px",
		};
	} catch (e) {
		return {
			paddingTop: statusBarHeight + "px",
			height: "44px",
			lineHeight: "44px",
			paddingLeft: "20px",
			paddingRight: "20px",
		};
	}
});

/* ---- 分类绑定列表 ---- */
const activeBindings = computed(() =>
	bindings.value.filter((b) => b.status === "active"),
);
const incomingRequests = computed(() =>
	bindings.value.filter(
		(b) => b.status === "pending" && b.role === "receiver",
	),
);
const outgoingRequests = computed(() =>
	bindings.value.filter(
		(b) => b.status === "pending" && b.role === "requester",
	),
);

/* ---- 对方显示名 ---- */
function partnerName(b) {
	if (b.partner_user) {
		return b.partner_user.username || "用户" + b.partner_user_id;
	}
	return "用户" + (b.partner_user_id || "?");
}

/* ---- 对方性别 ---- */
function partnerGender(b) {
	return b.partner_user
		? `${b.partner_user.identity_tag} ${b.partner_user.gender}` || ""
		: "";
}

/* ---- 加载绑定列表 ---- */
async function loadBindings() {
	try {
		const result = await getBindings();
		bindings.value = Array.isArray(result?.list) ? result.list : [];
	} catch (_) {
		bindings.value = [];
	}
}

onMounted(loadBindings);

/* ---- 操作 ---- */
async function handleApply() {
	const id = parseInt(targetUserId.value);
	if (!id || id === userId) {
		uni.showToast({ title: "请输入有效的用户 ID", icon: "none" });
		return;
	}
	try {
		await applyBinding(id);
		targetUserId.value = "";
		uni.showToast({ title: "申请已发送", icon: "success" });
		loadBindings();
	} catch (_) { }
}

async function handleAccept(b) {
	try {
		await acceptBinding(b.id);
		uni.showToast({ title: "已同意", icon: "success" });
		loadBindings();
	} catch (_) { }
}

async function handleUnbind(b) {
	try {
		await unbindBinding(b.id);
		uni.showToast({ title: "已解绑", icon: "success" });
		loadBindings();
	} catch (_) { }
}

function handleLogout() {
	uni.showModal({
		title: "退出登录",
		content: "确定要退出吗？",
		success(res) {
			if (res.confirm) {
				logout();
				uni.reLaunch({ url: "/pages/login/index" });
			}
		},
	});
}

function formatDate(d) {
	if (!d) return "";
	return d.substring(0, 10);
}

function goBack() {
	uni.navigateBack();
}
</script>

<style lang="scss" scoped>
.user-page {
	min-height: 100vh;
	padding-bottom: 80rpx;
}

.user-page {
	background: linear-gradient(180deg,
			var(--theme-page-top) 0%,
			var(--theme-page-mid) 220rpx,
			var(--theme-page-bottom) 100%);
}

.user-dark {
	background: linear-gradient(180deg,
			var(--theme-page-top-dark) 0%,
			var(--theme-page-mid-dark) 220rpx,
			var(--theme-page-bottom-dark) 100%);
}

/* ---- 头部 ---- */
.user-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12rpx;
}

.head-back {
	font-size: 52rpx;
	font-weight: 200;
	color: #1a1a1a;
	width: 60rpx;
	text-align: center;
}

.user-dark .head-back {
	color: #e5e5e7;
}

.head-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #1a1a1a;
}

.user-dark .head-title {
	color: #e5e5e7;
}

.head-spacer {
	width: 60rpx;
}

/* ---- 用户卡片 ---- */
.card {
	/* 统一卡片底座：白底、细边框、轻阴影，帮助页面建立更明确的层级 */
	margin: 0 24rpx 20rpx;
	padding: 28rpx;
	background: rgba(255, 255, 255, 0.92);
	border: 1px solid rgba(255, 255, 255, 0.72);
	border-radius: 28rpx;
	box-shadow: 0 16rpx 36rpx rgba(31, 47, 70, 0.08);
	display: flex;
	align-items: center;
}

.user-dark .card {
	background: rgba(37, 39, 46, 0.96);
	border-color: rgba(255, 255, 255, 0.06);
	box-shadow: 0 16rpx 36rpx rgba(0, 0, 0, 0.26);
}

.user-card {
	/* 用户卡片承担页面第一视觉焦点，因此单独加强背景和内边距 */
	padding: 34rpx 30rpx;
	background: linear-gradient(135deg, var(--theme-card-start) 0%, var(--theme-card-end) 100%);
}

.user-dark .user-card {
	background: linear-gradient(135deg, var(--theme-card-start-dark) 0%, var(--theme-card-end-dark) 100%);
}

.avatar {
	width: 96rpx;
	height: 96rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
	color: #fff;
	font-size: 40rpx;
	font-weight: 700;
	line-height: 96rpx;
	text-align: center;
	flex-shrink: 0;
	box-shadow: 0 12rpx 24rpx var(--theme-ring);
}

.user-info {
	margin-left: 24rpx;
	flex: 1;
}

.user-name {
	font-size: 32rpx;
	font-weight: 600;
	color: #1a1a1a;
	display: block;
	line-height: 1.3;
}

.user-dark .user-name {
	color: #e5e5e7;
}

.user-id {
	font-size: 24rpx;
	color: #8a8f99;
	margin-top: 8rpx;
}

.user-dark .user-id {
	color: #8e8e93;
}

/* ---- 分区标题 ---- */
.section-title {
	font-size: 28rpx;
	font-weight: 600;
	color: var(--theme-primary-strong);
	padding: 18rpx 30rpx 12rpx;
	letter-spacing: 1rpx;
}

.user-dark .section-title {
	color: var(--theme-primary);
}

/* ---- 绑定列表 ---- */
.card-list {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.bind-card {
	justify-content: space-between;
	margin: 0 24rpx;
	padding: 26rpx 28rpx;
	min-height: 120rpx;
}

.bind-info {
	flex: 1;
	min-width: 0;
}

.bind-name-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 12rpx;
}

.bind-name {
	font-size: 30rpx;
	font-weight: 600;
	color: #1a1a1a;
}

.user-dark .bind-name {
	color: #e5e5e7;
}

.bind-gender-tag {
	font-size: 20rpx;
	color: var(--theme-primary-strong);
	background: var(--theme-soft-bg);
	padding: 6rpx 14rpx;
	border-radius: 18rpx;
}

.user-dark .bind-gender-tag {
	color: var(--theme-primary);
	background: var(--theme-soft-bg-dark);
}

.bind-date {
	font-size: 22rpx;
	color: #8a8f99;
	margin-top: 10rpx;
	display: block;
	line-height: 1.4;
}

.user-dark .bind-date {
	color: #8e8e93;
}

.bind-actions {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	margin-left: 20rpx;
}

.unbind-btn {
	font-size: 24rpx;
	color: #ff3b30;
	padding: 14rpx 26rpx;
	background: rgba(255, 59, 48, 0.1);
	border-radius: 999rpx;
	font-weight: 600;
}

.unbind-btn:active {
	opacity: 0.6;
}

.accept-btn {
	font-size: 24rpx;
	color: #fff;
	background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
	padding: 14rpx 28rpx;
	border-radius: 999rpx;
	font-weight: 600;
	box-shadow: 0 10rpx 20rpx var(--theme-ring);
}

.accept-btn:active {
	opacity: 0.75;
}

/* ---- 发起绑定 ---- */
.apply-row {
	display: flex;
	align-items: center;
	width: 100%;
	gap: 16rpx;
}

.apply-card {
	/* 输入区既要像表单，也要保持和页面卡片体系一致 */
	flex-direction: column;
	align-items: stretch;
}

.apply-input {
	flex: 1;
	height: 84rpx;
	border: 2rpx solid var(--theme-ring);
	border-radius: 40rpx;
	padding: 0 28rpx;
	font-size: 26rpx;
	background: rgba(255, 255, 255, 0.96);
	color: #1a1a1a;
	box-sizing: border-box;
	box-shadow: inset 0 0 0 2rpx transparent;
}

.user-dark .apply-input {
	background: #3a3a3c;
	border-color: var(--theme-soft-bg-dark);
	color: #e5e5e7;
}

.apply-btn {
	flex-shrink: 0;
	padding: 0 34rpx;
	height: 84rpx;
	line-height: 84rpx;
	background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
	color: #fff;
	border-radius: 40rpx;
	font-size: 26rpx;
	font-weight: 600;
	text-align: center;
	box-shadow: 0 12rpx 24rpx var(--theme-ring);
}

.apply-btn:active {
	opacity: 0.75;
}

.apply-hint {
	font-size: 22rpx;
	color: #8a8f99;
	margin-top: 16rpx;
	line-height: 1.5;
}

.user-dark .apply-hint {
	color: #8e8e93;
}

.logout-btn {
	margin: 44rpx 24rpx 0;
	height: 96rpx;
	background: rgba(255, 255, 255, 0.92);
	border: 1px solid rgba(255, 59, 48, 0.12);
	border-radius: 28rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	color: #ff3b30;
	font-weight: 600;
	box-shadow: 0 14rpx 30rpx rgba(31, 47, 70, 0.06);
}

.logout-btn:active {
	opacity: 0.6;
}

.user-dark .logout-btn {
	background: rgba(37, 39, 46, 0.96);
	border-color: rgba(255, 59, 48, 0.18);
}

/* ---- 用户标签 ---- */
.user-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 14rpx;
}

.user-tag {
	font-size: 22rpx;
	color: var(--theme-primary-strong);
	background: var(--theme-soft-bg);
	padding: 6rpx 18rpx;
	border-radius: 999rpx;
}

.user-dark .user-tag {
	color: var(--theme-primary);
	background: var(--theme-soft-bg-dark);
}

/* ---- 个人资料卡片 ---- */
.profile-card {
	flex-direction: column;
	align-items: stretch;
	padding: 0 28rpx;
}

.profile-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	min-height: 104rpx;
}

.profile-label {
	font-size: 28rpx;
	color: #1a1a1a;
	font-weight: 500;
}

.user-dark .profile-label {
	color: #e5e5e7;
}

.profile-value-wrap {
	display: flex;
	align-items: center;
}

.profile-value {
	font-size: 28rpx;
	color: #1a1a1a;
	max-width: 280rpx;
	text-align: right;
}

.user-dark .profile-value {
	color: #e5e5e7;
}

.profile-value--empty {
	color: #ccc;
}

.user-dark .profile-value--empty {
	color: #636366;
}

.profile-arrow {
	font-size: 36rpx;
	color: var(--theme-primary);
	margin-left: 12rpx;
}

.user-dark .profile-arrow {
	color: var(--theme-primary);
}

.profile-divider {
	height: 1rpx;
	background: #edf0f5;
}

.user-dark .profile-divider {
	background: #48484a;
}

/* ---- 编辑资料弹窗 ---- */
.profile-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(6, 10, 18, 0.48);
	z-index: 999;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 32rpx;
	box-sizing: border-box;
}

.profile-modal {
	width: 600rpx;
	background: #fff;
	border-radius: 28rpx;
	padding: 40rpx 36rpx;
	box-shadow: 0 24rpx 60rpx rgba(15, 23, 42, 0.18);
}

.user-dark .profile-modal {
	background: #2c2c2e;
}

.modal-title {
	font-size: 32rpx;
	font-weight: 700;
	color: var(--theme-primary-strong);
	text-align: center;
	display: block;
	margin-bottom: 32rpx;
}

.user-dark .modal-title {
	color: var(--theme-primary);
}

.modal-label {
	font-size: 26rpx;
	color: #999;
	display: block;
	margin: 20rpx 0 12rpx;
}

.user-dark .modal-label {
	color: #8e8e93;
}

.modal-input {
	height: 88rpx;
	border: 2rpx solid var(--theme-ring);
	border-radius: 16rpx;
	padding: 0 24rpx;
	font-size: 28rpx;
	background: #f8fafc;
	color: #1a1a1a;
}

.user-dark .modal-input {
	background: #3a3a3c;
	border-color: var(--theme-soft-bg-dark);
	color: #e5e5e7;
}

.modal-gender-row {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
	margin-bottom: 8rpx;
}

.modal-gender-row .gender-tag {
	font-size: 26rpx;
	color: #666;
	padding: 14rpx 36rpx;
	border-radius: 999rpx;
	border: 2rpx solid var(--theme-ring);
	background: #f8fafc;
}

.user-dark .modal-gender-row .gender-tag {
	color: #c7c7cc;
	border-color: #48484a;
	background: #2c2c2e;
}

.gender-tag--active {
	color: #fff !important;
	background: var(--theme-primary) !important;
	border-color: var(--theme-primary) !important;
}

.modal-btns {
	display: flex;
	gap: 20rpx;
	margin-top: 36rpx;
}

.modal-btn {
	flex: 1;
	height: 88rpx;
	border-radius: 44rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 30rpx;
	font-weight: 600;
}

.modal-btn--cancel {
	background: #f8f8f8;
	color: #666;
}

.user-dark .modal-btn--cancel {
	background: #3a3a3c;
	color: #c7c7cc;
}

.modal-btn--save {
	background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
	color: #fff;
}

.modal-btn:active {
	opacity: 0.75;
}

.bind-empty-card {
	/* 空状态也复用卡片视觉，避免页面在无数据时显得像未渲染完成 */
	flex-direction: column;
	align-items: flex-start;
	padding: 30rpx 28rpx;
}

.bind-empty-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #1a1a1a;
}

.bind-empty-desc {
	margin-top: 10rpx;
	font-size: 24rpx;
	line-height: 1.6;
	color: #8a8f99;
}

.user-dark .bind-empty-title {
	color: #e5e5e7;
}

.user-dark .bind-empty-desc {
	color: #8e8e93;
}
</style>
