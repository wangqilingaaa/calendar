/**
 * 动态人物列表 — 取当前用户 + 所有绑定用户的 identity_tag
 *
 * 替代 store/calendar.js 中硬编码的 PERSONS。
 * 人物标识用 identity_tag（身份标签），"共同" 固定为 'both'。
 * 日记接口 /diary 的 person 字段直接存 identity_tag（而非 user ID）。
 *
 * 绑定接口 GET /binding 返回的每条记录含：
 *   partner_user_id — 对方 user ID
 *   partner_user    — 对方用户对象 { id, username, identity_tag, gender, ... }
 *   role            — 'requester' | 'responder'
 *   status          — 'active' | 'pending'
 */
import { getUser } from "@/store/auth.js";
import { getBindings } from "@/api/binding.js";

/** 人物配色盘 — 按顺序循环分配 */
export const PERSON_COLORS = [
	"#4A90D9", // 蓝
	"#E884A6", // 粉
	"#9B59B6", // 紫
	"#FF6B6B", // 红
	"#4CAF50", // 绿
	"#FF9800", // 橙
];

/** 兜底人物列表（未登录或加载失败时） */
export const DEFAULT_PERSONS = Object.freeze([
	{ id: "both", name: "共同", color: PERSON_COLORS[2] },
]);

/**
 * 从绑定记录中提取对方 identity_tag
 */
function extractPartnerTag(b) {
	if (b.partner_user && b.partner_user.identity_tag) {
		return b.partner_user.identity_tag;
	}
	if (b.partner_user && b.partner_user.username) {
		return b.partner_user.username;
	}
	return "";
}

/**
 * 加载动态人物列表（person 标识 = identity_tag）
 *
 * 返回的人物对象同时用于：
 *  - 人物选择（id 作为选中值）
 *  - 日记读写（/diary 接口的 person 字段直接存 identity_tag）
 *  - 统计聚合（按 id 分组）
 * 因此 id 统一使用 identity_tag；"共同" 固定为 'both'。
 *
 * @returns {Promise<Array<{id: string, name: string, color: string}>>}
 */
export async function loadPersons() {
	const user = getUser();
	if (!user || !user.id) return [...DEFAULT_PERSONS];

	const persons = [];

	// 1. 自己（id = identity_tag，兜底用 username / "我"）
	const selfTag = user.identity_tag || user.username || "我";
	persons.push({
		id: user.id,
		name: selfTag,
		color: PERSON_COLORS[0],
	});

	// 2. 绑定的用户（仅 active 状态），id 同样用对方 identity_tag
	try {
		const result = await getBindings();
		const list = result && result.list ? result.list : [];
		const active = list.filter((b) => b.status === "active");

		active.forEach((b, i) => {
			const fallbackId =
				b.partner_user_id || (b.partner_user && b.partner_user.id);
			const tag = extractPartnerTag(b) || "用户" + fallbackId;
			persons.push({
				id: fallbackId,
				name: tag,
				color: PERSON_COLORS[(i + 1) % PERSON_COLORS.length],
			});
		});
	} catch (_) {
		// 绑定加载失败，仅返回自己 + 共同
	}

	// 3. "共同"选项（固定 id = 'both'，日记 person 字段也存 'both'）
	persons.push({
		id: "both",
		name: "共同",
		color: PERSON_COLORS[2],
	});

	return persons;
}
