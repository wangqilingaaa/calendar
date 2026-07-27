/**
 * AI 能力封装 — 通过后端代理调用大模型
 *
 * 说明：
 * - 不再从前端直连 DeepSeek，所有大模型请求统一走后端 /ai/diary/* 接口。
 * - 后端持有 API Key，避免前端暴露密钥，同时解决 App/H5 跨域和白名单问题。
 * - 语音能力仍使用平台原生能力（目前仅微信小程序支持）。
 *
 * 流程：
 * 1. 长按 AI 按钮 → 平台语音识别（目前仅微信小程序支持）
 * 2. 拿到识别文本（或用户直接文字输入）
 * 3. 调用 parseDiaryByText 请求后端，返回 createDiary 所需 JSON
 * 4. 调用 createDiary 完成添加
 */

import { post } from './request.js'
import { EVENT_TYPES } from '@/store/calendar.js'

let recognitionManager = null

/** 事件类型中文名列表，供后端构造提示词 */
const EVENT_NAMES = EVENT_TYPES.map(t => t.name)

/** 获取微信同声传译语音识别管理器（仅微信小程序可用） */
export function getSpeechRecognitionManager() {
	// #ifdef MP-WEIXIN
	if (!recognitionManager) {
		const plugin = requirePlugin('WechatSI')
		recognitionManager = plugin.getRecordRecognitionManager()
	}
	// #endif
	return recognitionManager
}

/**
 * 调用后端解析自然语言为日记参数
 * @param {string} text 用户输入的自然语言
 * @returns {Promise<{date: string, person: string, event: string, event_remark: string, attachments: array}>}
 */
export function parseDiaryByText(text) {
	return post('/ai/diary/parse', {
		text,
		event_names: EVENT_NAMES
	})
}

/**
 * 根据当月数据生成自然语言示例
 * @param {object} monthData 当月数据，格式同 getMonthData 返回
 * @returns {Promise<string[]>} 示例字符串数组
 */
export function generateTipsByMonthData(monthData) {
	return post('/ai/diary/tips', {
		month_data: monthData || {},
		event_names: EVENT_NAMES
	}).then(data => {
		if (Array.isArray(data)) {
			return data.slice(0, 4)
		}
		if (data && Array.isArray(data.tips)) {
			return data.tips.slice(0, 4)
		}
		throw new Error('AI 返回格式异常')
	})
}
