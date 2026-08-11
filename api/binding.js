/**
 * 用户绑定相关 API
 */
import { get, post } from "./request.js";

/** 获取绑定列表（返回 UserBinding[]） */
export function getBindings() {
	return get("/binding");
}

/** 发起绑定申请 */
export function applyBinding(targetUserId) {
	return post("/binding/apply", { target_user_id: targetUserId });
}

/** 同意绑定 */
export function acceptBinding(id) {
	return post("/binding/" + id + "/accept");
}

/** 解绑 */
export function unbindBinding(id) {
	return post("/binding/" + id + "/unbind");
}
