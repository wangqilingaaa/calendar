/**
 * 动态人物列表
 *
 * 约定：
 * 1. 前端人物主键统一使用数据库 user.id；
 * 2. name 仅用于展示；
 * 3. personValue 用于兼容后端/历史数据里可能出现的 identity_tag、旧名称等人物值。
 *
 * 绑定接口 GET /binding 返回的每条记录含：
 *   partner_user_id — 对方 user ID
 *   partner_user    — 对方用户对象 { id, username, identity_tag, gender, ... }
 *   role            — 'requester' | 'responder'
 *   status          — 'active' | 'pending'
 */
import { getUser } from "@/store/auth.js";
import { getBindings } from "@/api/binding.js";
import { PERSONS as LEGACY_PERSONS } from "@/store/calendar.js";

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
	{
		id: "both",
		name: "共同",
		identity_tag: "共同",
		color: PERSON_COLORS[2],
		personValue: "both",
	},
]);

/**
 * 仅按数据库 id 查找人物配置。
 *
 * 业务主链路在完成归一化之后，只允许通过这个函数按 id 取人物。
 * 这样可以保证前端展示、选择、统计都围绕同一套主键运行。
 */
export function findPersonById(personId, persons = []) {
	if (!personId) return null;
	const target = String(personId);
	return (
		persons.find((item) => String(item.id) === target) ||
		LEGACY_PERSONS.find((item) => String(item.id) === target) ||
		null
	);
}

/**
 * 将任意人物输入归一化为统一的数据库 person id。
 *
 * 兼容输入来源：
 * - 数据库 id
 * - 后端/历史值：identity_tag / username / husband / wife / both
 * - 展示名：例如“共同”“老公”“老婆”
 *
 * 设计目标是：
 * 1. 在边界层兼容历史值和自然语言输入；
 * 2. 一旦进入业务主链路，就统一只流转数据库 id。
 */
export function normalizePersonId(raw, persons = []) {
	if (!raw) return "both";
	const text = String(raw).trim();
	if (!text) return "both";

	const byId = findPersonById(text, persons);
	if (byId) return byId.id;

	const byValue =
		persons.find(
			(item) =>
				String(item.personValue || item.id) === text ||
				item.name === text,
		) || null;
	if (byValue) return byValue.id;

	const byName =
		LEGACY_PERSONS.find((item) => item.name === text) ||
		null;
	if (byName) return byName.id;

	return "both";
}

/**
 * 将前端使用的数据库 person id 转换为接口提交值。
 *
 * 目前优先使用 personValue，是为了兼容后端仍可能返回/接受 identity_tag 的情况。
 * 前端内部仍然坚持只用数据库 id 作为统一主键。
 */
export function toPersonPayload(personId, persons = []) {
	const person = findPersonById(personId, persons);
	if (!person) return personId || "both";
	return person.personValue || person.id;
}

/**
 * 往人物列表中追加一项，并按数据库 id 去重。
 *
 * 这里额外做一层保护的原因是：
 * 1. 当前用户与绑定用户最终都要映射成数据库 id；
 * 2. 一旦后端返回重复绑定，
 *    如果不去重，首页人物色点和弹窗人物选项都会出现重复项。
 */
function appendPerson(persons, person) {
	if (!person || !person.id) return;
	if (persons.some((item) => String(item.id) === String(person.id))) return;
	persons.push(person);
}

/**
 * 从绑定记录中提取对方用于展示/兼容的文本值
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
 * 加载动态人物列表
 *
 * 返回的人物对象同时用于：
 *  - 人物选择（id = 数据库 id）
 *  - 前端匹配（统一按数据库 id 对齐）
 *  - 与接口交互（通过 personValue 兼容后端/历史 person 值）
 *  - 统计聚合（按 id 分组）
 * 因此 id 统一使用数据库 id；"共同" 固定为 'both'。
 *
 * @returns {Promise<Array<{id: string|number, name: string, identity_tag: string, color: string, personValue: string|number}>>}
 */
export async function loadPersons() {
	const user = getUser();
	if (!user || !user.id) return [...DEFAULT_PERSONS];

	const persons = [];

	// 1. 自己
	//    id 必须固定为数据库 user.id，作为前端统一主键。
	//    personValue 额外保留 identity_tag / username，用于兼容接口或历史数据。
	const selfTag = user.identity_tag || user.username || "我";
	appendPerson(persons, {
		id: user.id,
		name: selfTag,
		// identity_tag 作为展示主口径单独保留，
		// 这样组件层可以明确优先展示它，而不是继续复用 name 猜测含义。
		identity_tag: selfTag,
		color: PERSON_COLORS[0],
		personValue: selfTag,
	});

	// 2. 绑定的用户（仅 active 状态）
	//    同样统一使用对方数据库 id 作为前端主键。
	try {
		const result = await getBindings();
		const list = result && result.list ? result.list : [];
		const active = list.filter((b) => b.status === "active");

		active.forEach((b, i) => {
			const fallbackId =
				b.partner_user_id || (b.partner_user && b.partner_user.id);
			const tag = extractPartnerTag(b) || String(fallbackId || "用户");
			appendPerson(persons, {
				id: fallbackId,
				name: tag,
				// 绑定用户同样显式保留 identity_tag，
				// 保证人物选择、人物标签等展示位都能拿到统一字段。
				identity_tag: tag,
				color: PERSON_COLORS[(i + 1) % PERSON_COLORS.length],
				personValue: tag,
			});
		});
	} catch (_) {
		// 绑定加载失败时，至少保留自己 + 共同，保证日历仍可正常渲染。
	}

	// 3. "共同"选项
	appendPerson(persons, {
		id: "both",
		name: "共同",
		identity_tag: "共同",
		color: PERSON_COLORS[2],
		personValue: "both",
	});

	return persons;
}
