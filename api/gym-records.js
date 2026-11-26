/**
 * 健身记录相关 API
 *
 * 健身记录独立存储结构化的动作/组数/次数/重量，
 * 日历展示时与日记事件合并，历史运动日记仍走原日记接口。
 */
import { get, post, put, del } from "./request.js";

/** 按天查询健身记录 */
export function queryGymRecordsByDay(date, person = "") {
	const params = { dimension: "day", date };
	if (person) params.person = person;
	return get("/gym-records", params);
}

/** 按月查询健身记录 */
export function queryGymRecordsByMonth(month, person = "") {
	const params = { dimension: "month", month };
	if (person) params.person = person;
	return get("/gym-records", params);
}

/** 新增健身记录；后端会自动补齐动作库并同步绑定用户 */
export function createGymRecord({ date, person, action, sets, reps, weight, note }) {
	return post("/gym-records", {
		date,
		person: person || "",
		action_name: action,
		sets,
		reps,
		weight: weight || 0,
		note: note || "",
	});
}

/** 修改健身记录；未传字段保持原值 */
export function updateGymRecord(id, { date, person, action, sets, reps, weight, note }) {
	return put("/gym-records/" + id, {
		date,
		person: person || "",
		action_name: action,
		sets,
		reps,
		weight: weight || 0,
		note: note || "",
	});
}

/** 删除健身记录 */
export function deleteGymRecord(id) {
	return del("/gym-records/" + id);
}
