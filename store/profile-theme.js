/**
 * 资料主题管理
 *
 * 作用：
 * 1. 根据当前登录用户的 gender 计算页面主题类
 * 2. 给页面和弹层提供统一的主题入口，避免每个页面重复写一套判断逻辑
 */
import { getUser } from "@/store/auth.js";

/**
 * 根据性别值解析主题类。
 * 这里保持映射逻辑足够简单，方便后续继续扩展身份标签 / 会员等级等主题体系。
 */
export function resolveProfileThemeClass(gender = "") {
	if (gender === "男") {
		return "theme-male";
	}
	if (gender === "女") {
		return "theme-female";
	}
	return "theme-neutral";
}

/**
 * 读取当前登录用户的资料，并返回对应的主题类。
 * 页面 onShow 时重新调用，可以保证从“我的”页面修改性别后，其他页面返回时能同步更新主题。
 */
export function getCurrentProfileThemeClass() {
	const user = getUser() || {};
	return resolveProfileThemeClass(user.gender || "");
}
