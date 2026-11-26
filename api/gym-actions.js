/**
 * 健身动作库相关 API
 *
 * 动作库由后端统一维护：
 * - 输入时按名称搜索联想
 * - 新增健身记录时后端自动把新动作写入动作库
 */
import { get } from "./request.js";

/** 按名称搜索健身动作；keyword 为空时返回常用动作 */
export function searchGymActions(keyword = "", limit = 10) {
	const params = { limit };
	if (keyword) params.keyword = keyword;
	// 联想搜索属于输入辅助，失败时不弹 toast 打断录入
	return get("/gym-actions", params, { silent: true });
}
