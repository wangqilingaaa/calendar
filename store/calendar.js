/**
 * 日历数据管理 — 全部操作走后端 API
 *
 * 本地仅保留：日期状态 (status) — 纯 UI 标记
 *
 * API 模型映射：
 *   Diary { ID, date, person, event, event_remark }
 *   Event { id(apiId), type, title, count, person }
 */

import { createDiary, queryDiaryByDay, queryDiaryByMonth, deleteDiary } from '@/api/diary.js'

/* ----- 预定义事件类型 ----- */
export const EVENT_TYPES = Object.freeze([
	{ id: 'water',       name: '喝水',   countable: true,  color: '#2196F3' },
	{ id: 'eat',         name: '吃饭',   countable: true, color: '#5856D6' },
	{ id: 'exercise',    name: '运动',   countable: true,  color: '#4CAF50' },
	{ id: 'medicine',    name: '吃药',   countable: true,  color: '#FF9800' },
	{ id: 'weight',      name: '体重',   countable: true,  color: '#FF6B6B' },
	{ id: 'study',       name: '学习',   countable: true,  color: '#9C27B0' },
	{ id: 'anniversary', name: '纪念日', countable: false, color: '#FF2D55' },
	{ id: 'task',        name: '待办',   countable: false, color: '#FF5722' },
	{ id: 'custom',      name: '自定义', countable: false, color: '#8E8E93' }
])

/* ----- 预定义日期状态（仅本地） ----- */
export const DATE_STATUSES = Object.freeze([
	{ id: 'normal',    name: '普通', color: 'transparent' },
	{ id: 'holiday',   name: '假期', color: '#4CAF50' },
	{ id: 'busy',      name: '忙碌', color: '#FF9800' },
	{ id: 'important', name: '重要', color: '#FF2D55' }
])

/* ----- 人物选项 ----- */
export const PERSONS = Object.freeze([
	{ id: 'husband', name: '老公', color: '#4A90D9' },
	{ id: 'wife',    name: '老婆', color: '#E884A6' },
	{ id: 'both',    name: '共同', color: '#9B59B6' }
])

/* ----- 工具：日期键 "YYYY-MM-DD" ----- */
export function dateKey(year, month, day) {
	return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/* ============ 类型 ↔ 名称互查 ============ */
function typeNameById(id) {
	const t = EVENT_TYPES.find(t => t.id === id)
	return t ? t.name : '自定义'
}
function typeIdByName(name) {
	const t = EVENT_TYPES.find(t => t.name === name)
	return t ? t.id : 'custom'
}

/* ============ API → 本地模型转换 ============ */

/** 将 API 日记转换为本地事件 */
function diaryToEvent(d) {
	return {
		id: d.ID,
		type: typeIdByName(d.event),
		title: d.event_remark || d.event,
		count: 1,
		person: d.person || 'both',
		createdAt: d.CreatedAt || ''
	}
}

/* ============ 日期状态（本地存储） ============ */
const STATUS_KEY = 'cal_date_status'

function loadStatus() {
	try { const r = uni.getStorageSync(STATUS_KEY); return r ? JSON.parse(r) : {} } catch (_) { return {} }
}
function saveStatus(s) { uni.setStorageSync(STATUS_KEY, JSON.stringify(s)) }

export function getDateStatus(year, month, day) {
	const key = dateKey(year, month, day)
	return loadStatus()[key] || 'normal'
}

export function setDateStatus(year, month, day, status) {
	const key = dateKey(year, month, day)
	const s = loadStatus()
	s[key] = status
	saveStatus(s)
}

/* ============ 事件 CRUD（全部异步） ============ */

/**
 * 添加事件
 * 可计数类型：每次添加都创建一条新日记，聚合时按条数统计
 */
export async function addEvent(year, month, day, eventTypeId, title, personId) {
	const date = dateKey(year, month, day)
	const typeName = typeNameById(eventTypeId)
	return createDiary({
		date,
		person: personId || 'both',
		event: typeName,
		eventRemark: title || ''
	})
}

/** 删除事件（按 API ID） */
export async function removeEvent(apiId) {
	return deleteDiary(apiId)
}

/** 减少可计数事件 = 删除最新一条同类型日记 */
export async function decrementEvent(year, month, day, eventTypeId) {
	const date = dateKey(year, month, day)
	const typeName = typeNameById(eventTypeId)
	const result = await queryDiaryByDay(date)
	if (!result || !result.diaries) return

	const diaries = result.diaries
		.filter(d => d.event === typeName)
		.sort((a, b) => b.ID - a.ID) // 最新在前

	if (diaries.length > 0) {
		await deleteDiary(diaries[0].ID)
	}
}

/** 清空某天所有事件 */
export async function clearDateEvents(year, month, day) {
	const date = dateKey(year, month, day)
	const result = await queryDiaryByDay(date)
	if (!result || !result.diaries) return
	for (const d of result.diaries) {
		await deleteDiary(d.ID)
	}
}

/* ============ 查询（返回本地事件格式） ============ */

/** 获取某一天的事件列表 */
export async function getDateEvents(year, month, day) {
	const date = dateKey(year, month, day)
	try {
		const result = await queryDiaryByDay(date)
		return result && result.diaries ? result.diaries.map(diaryToEvent) : []
	} catch (_) {
		return []
	}
}

/** 获取某个月全部数据，按日期分组 */
export async function getMonthData(year, month) {
	const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
	try {
		const result = await queryDiaryByMonth(monthStr)
		if (!result || !result.days) return {}

		const map = {}
		result.days.forEach(dayGroup => {
			map[dayGroup.date] = {
				status: dayGroup.daily_status,
				events: dayGroup.diaries.map(diaryToEvent)
			}
		})
		return map
	} catch (_) {
		return {}
	}
}

/* ============ 统计（API 聚合） ============ */

/** 获取日期范围内所有日记（扁平列表） */
export async function getDateRangeEvents(startKey, endKey) {
	// 简化：按月拉取然后过滤
	const [sy, sm] = startKey.split('-').map(Number)
	const [ey, em] = endKey.split('-').map(Number)
	const all = []

	for (let y = sy; y <= ey; y++) {
		const mStart = (y === sy) ? sm : 1
		const mEnd = (y === ey) ? em : 12
		for (let m = mStart; m <= mEnd; m++) {
			const monthStr = `${y}-${String(m).padStart(2, '0')}`
			try {
				const result = await queryDiaryByMonth(monthStr)
				if (result && result.days) {
					result.days.forEach(day => {
						if (day.date >= startKey && day.date <= endKey) {
							day.diaries.forEach(d => {
								all.push({ ...diaryToEvent(d), date: day.date })
							})
						}
					})
				}
			} catch (_) { /* skip */ }
		}
	}
	return all
}

/** 按人物→类别聚合 */
export function aggregateByPersonThenType(events) {
	const result = {}
	PERSONS.forEach(p => {
		result[p.id] = { id: p.id, name: p.name, color: p.color, total: 0, types: {} }
		EVENT_TYPES.forEach(t => { result[p.id].types[t.id] = { id: t.id, name: t.name, color: t.color, total: 0, countable: t.countable } })
	})
	events.forEach(ev => {
		const pid = ev.person || 'both'
		const tid = ev.type
		if (result[pid] && result[pid].types[tid]) {
			result[pid].total++
			result[pid].types[tid].total++
		}
	})
	return Object.values(result)
		.filter(p => p.total > 0)
		.map(p => ({
			...p,
			types: Object.values(p.types).filter(t => t.total > 0)
		}))
}

export { dateKey as defaultDateKey }
