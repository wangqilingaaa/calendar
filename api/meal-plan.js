/**
 * 周计划（Meal Plan）相关 API
 *
 * 接口文档：travel_route Meal Plan API v1.0.0
 * 约定：week_start_date 必须是周一日期，格式 yyyy-mm-dd；
 *       所有接口需登录（自动注入 Bearer token）。
 */
import { get, post, put, del } from './request.js'

/** 查询指定周的周计划；该周未创建时返回 exists=false + 空 7 天结构 */
export function getMealPlan(weekStartDate) {
	return get('/meal-plan', { week_start_date: weekStartDate })
}

/** 创建某一周的空白周计划 */
export function createMealPlan(weekStartDate) {
	return post('/meal-plan', { week_start_date: weekStartDate })
}

/** 复制上周计划到目标周（保留菜名/天/餐次/排序，done 重置为 false） */
export function copyLastWeekPlan(weekStartDate) {
	return post('/meal-plan/copy-last-week', { week_start_date: weekStartDate })
}

/** 向指定周计划中添加食谱 */
export function addMealPlanItem(planId, { dayIndex, mealId, name, done = false, sortOrder }) {
	const body = { day_index: dayIndex, meal_id: mealId, name, done }
	if (sortOrder != null) body.sort_order = sortOrder
	return post(`/meal-plan/${planId}/items`, body)
}

/** 修改单条食谱（局部更新，任意字段可单独提交） */
export function updateMealPlanItem(itemId, patch) {
	return put(`/meal-plan/items/${itemId}`, patch)
}

/** 删除单条食谱 */
export function deleteMealPlanItem(itemId) {
	return del(`/meal-plan/items/${itemId}`)
}

/** 向指定周计划中添加原材料 */
export function addMealPlanMaterial(planId, { name, purchased = false, sortOrder }) {
	const body = { name, purchased }
	if (sortOrder != null) body.sort_order = sortOrder
	return post(`/meal-plan/${planId}/materials`, body)
}

/** 修改单条原材料（局部更新，任意字段可单独提交） */
export function updateMealPlanMaterial(materialId, patch) {
	return put(`/meal-plan/materials/${materialId}`, patch)
}

/** 删除单条原材料 */
export function deleteMealPlanMaterial(materialId) {
	return del(`/meal-plan/materials/${materialId}`)
}
