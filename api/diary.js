/**
 * 日记相关 API
 */
import { get, post, del, put } from './request.js'

/** 创建日记 */
export function createDiary({ date, person, event, eventRemark, attachments }) {
	return post('/diary', {
		date,
		person: person || '',
		event,
		event_remark: eventRemark || '',
		attachments: attachments || []
	})
}

/** 按天查询 */
export function queryDiaryByDay(date, page = 1, pageSize = 50, person, keyword) {
	const params = { dimension: 'day', date, page, page_size: pageSize }
	if (person) params.person = person
	if (keyword) params.keyword = keyword
	return get('/diary', params)
}

/** 按月查询 */
export function queryDiaryByMonth(month, page = 1, pageSize = 200) {
	return get('/diary', { dimension: 'month', month, page, page_size: pageSize })
}

/** 删除单条 */
export function deleteDiary(id) {
	return del('/diary/' + id)
}

/** 批量删除 */
export function deleteDiaryBatch(ids) {
	return del('/diary', { ids })
}

export function putDiaryStatus(param) {
	return put('/diary/status', param)
}
