/**
 * 认证状态 — Token 持久化 + 登录状态管理
 */
import { isLoggedIn, saveToken, clearToken } from "@/api/request.js";

const STORAGE_USER_KEY = "auth_user";

/** 获取当前用户信息 */
export function getUser() {
	try {
		const raw = uni.getStorageSync(STORAGE_USER_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch (_) {
		return null;
	}
}

/** 保存用户信息 */
export function saveUser(user) {
	uni.setStorageSync(STORAGE_USER_KEY, JSON.stringify(user));
}

/** 清除登录态 */
export function logout() {
	clearToken();
	uni.removeStorageSync(STORAGE_USER_KEY);
}

/** 登录成功后保存 */
export function setAuth(token, user) {
	saveToken(token);
	saveUser({
		id: user.id,
		username: user.username,
		identity_tag: user.identity_tag || "",
		gender: user.gender || "",
	});
}

/** 局部更新用户信息（如修改 identity_tag / gender 后同步本地） */
export function updateUserFields(fields = {}) {
	const current = getUser() || {};
	const merged = { ...current, ...fields };
	saveUser(merged);
	return merged;
}

/** 检查登录状态 */
export function checkAuth() {
	return isLoggedIn();
}

export { isLoggedIn };
