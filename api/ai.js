/**
 * AI 能力封装 — 前端直连 DeepSeek + 平台语音识别能力
 *
 * ⚠️ 安全提示：
 * DeepSeek API Key 写在前端会被反编译/抓包获取，仅适合 demo 或个人使用。
 * 正式上线前请通过后端代理，或使用服务端云函数调用大模型。
 *
 * 平台说明：
 * - 微信小程序：语音用微信同声传译插件（需在 manifest 声明并在后台添加插件）。
 * - H5：语音能力降级，仅保留文字输入；直接请求 DeepSeek 可能受浏览器 CORS 限制。
 * - App（Android/iOS）：语音能力降级，仅保留文字输入；uni.request 可直接访问 DeepSeek。
 *
 * 流程：
 * 1. 长按 AI 按钮 → 平台语音识别（目前仅微信小程序支持）
 * 2. 拿到识别文本（或用户直接文字输入）
 * 3. 调用 parseDiaryByText 请求 DeepSeek，返回 createDiary 所需 JSON
 * 4. 调用 createDiary 完成添加
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_MODEL = 'deepseek-chat'

/** 从本地配置文件读取 DeepSeek API Key（该文件不提交到 Git） */
let DEEPSEEK_API_KEY = ''
try {
	const localConfig = require('./config.local.js')
	DEEPSEEK_API_KEY = localConfig.DEEPSEEK_API_KEY || ''
} catch (e) {
	// config.local.js 不存在时留空
}

let recognitionManager = null

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

/** 构造系统提示词，约束 DeepSeek 返回 createDiary 所需 JSON */
function buildSystemPrompt(context = {}) {
	const today = context.today || ''
	const eventNames = (context.eventNames || []).join('、') || '自定义'
	return `你是一个日历事件录入助手。请把用户的自然语言严格转换成如下 JSON，对应 createDiary 接口的入参字段，不要添加任何额外字段：
{
  "date": "YYYY-MM-DD",
  "person": "husband | wife | both",
  "event": "事件类型中文名",
  "event_remark": "备注，可选，默认空字符串",
  "attachments": []
}
规则：
1. date：未指定日期默认今天（${today}）；支持理解今天、明天、后天、大后天、下周X、X月X号等表达。
2. person：老公/丈夫->husband，老婆/妻子->wife，共同/我俩/我们/未指定->both。
3. event：必须是以下类型之一：${eventNames}；如果用户描述的事件不在列表中，返回"自定义"。
4. event_remark：保留用户提到的具体数值、品牌、地点等细节；没有就返回空字符串。
5. attachments：固定返回空数组 []。
请只输出 JSON，不要任何解释。`
}

/** 构造示例生成系统提示词 */
function buildTipsSystemPrompt(context = {}) {
	const today = context.today || ''
	const eventNames = (context.eventNames || []).join('、') || '自定义'
	return `你是日历事件录入助手。请根据用户提供的本月事件数据，生成 4 条适合快速录入的自然语言示例。
要求：
1. 每条示例都要对应一个可能继续记录的事件，优先基于本月高频事件、人物、习惯生成。
2. 示例应包含日期表达（如今天、明天、后天）、人物（老公/老婆/共同）和事件细节。
3. 事件类型必须是以下之一：${eventNames}；不在列表中时使用"自定义"。
4. 输出严格为 JSON 对象，不要任何解释，格式如下：{"tips": ["明天老公喝水 500ml", "今晚老婆运动 30 分钟", "后天共同吃纪念日蛋糕", "今天体重 62.5kg"]}。
今天日期：${today}`
}

/** 根据当月数据生成示例（供 AI 弹窗「试试这样说」使用） */
export function generateTipsByMonthData(monthData, context = {}) {
	return new Promise((resolve, reject) => {
		const eventNames = context.eventNames || []
		const today = context.today || ''
		const hasData = monthData && typeof monthData === 'object' && Object.keys(monthData).length > 0

		// 把月度数据转成简明统计文本
		let summary = ''
		if (hasData) {
			const dayEntries = Object.entries(monthData).slice(0, 31)
			const lines = dayEntries.map(([date, day]) => {
				const events = (day.events || []).map(e => {
					const personName = e.person === 'husband' ? '老公' : e.person === 'wife' ? '老婆' : '共同'
					return `${personName}:${e.title || e.type || '事件'}`
				}).join('、')
				return `${date}: ${events || '无事件'}`
			})
			summary = `本月日期：${today ? today.slice(0, 7) : ''}\n事件类型：${eventNames.join('、')}\n每日记录：\n${lines.join('\n')}`
		} else {
			summary = `本月暂无记录。请基于以下可用事件类型生成 4 条常见的日常记录示例：${eventNames.join('、')}。`
		}

		console.log('[AI Tips] 准备调用 DeepSeek，summary:', summary)

		uni.request({
			url: DEEPSEEK_API_URL,
			method: 'POST',
			header: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + DEEPSEEK_API_KEY
			},
			data: {
				model: DEEPSEEK_MODEL,
				messages: [
					{ role: 'system', content: buildTipsSystemPrompt(context) },
					{ role: 'user', content: summary }
				],
				response_format: { type: 'json_object' }
			},
			success(res) {
				console.log('[AI Tips] DeepSeek 响应 status:', res.statusCode, 'data:', res.data)
				if (res.statusCode !== 200 || !res.data) {
					const msg = (res.data && res.data.error && res.data.error.message) || 'DeepSeek 请求失败'
					reject(new Error(msg))
					return
				}
				const content = res.data.choices && res.data.choices[0] && res.data.choices[0].message && res.data.choices[0].message.content
				if (!content) {
					reject(new Error('DeepSeek 返回为空'))
					return
				}
				try {
					const data = JSON.parse(content)
					console.log('[AI Tips] DeepSeek 解析后:', data)
					if (Array.isArray(data.tips) && data.tips.length > 0) {
						resolve(data.tips.slice(0, 4))
					} else if (Array.isArray(data) && data.length > 0) {
						resolve(data.slice(0, 4))
					} else {
						reject(new Error('AI 返回格式异常'))
					}
				} catch (e) {
					reject(new Error('AI 返回格式异常'))
				}
			},
			fail(err) {
				console.error('[DeepSeek] 网络错误:', err)
				reject(err)
			}
		})
	})
}

/** 调用 DeepSeek 解析自然语言为日记参数 */
export function parseDiaryByText(text, context = {}) {
	return new Promise((resolve, reject) => {
		uni.request({
			url: DEEPSEEK_API_URL,
			method: 'POST',
			header: {
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + DEEPSEEK_API_KEY
			},
			data: {
				model: DEEPSEEK_MODEL,
				messages: [
					{ role: 'system', content: buildSystemPrompt(context) },
					{ role: 'user', content: text }
				],
				response_format: { type: 'json_object' }
			},
			success(res) {
				if (res.statusCode !== 200 || !res.data) {
					const msg = (res.data && res.data.error && res.data.error.message) || 'DeepSeek 请求失败'
					uni.showToast({ title: msg, icon: 'none' })
					reject(new Error(msg))
					return
				}
				const content = res.data.choices && res.data.choices[0] && res.data.choices[0].message && res.data.choices[0].message.content
				if (!content) {
					uni.showToast({ title: 'DeepSeek 返回为空', icon: 'none' })
					reject(new Error('DeepSeek 返回为空'))
					return
				}
				try {
					const data = JSON.parse(content)
					resolve(data)
				} catch (e) {
					uni.showToast({ title: 'AI 返回格式异常', icon: 'none' })
					reject(new Error('AI 返回格式异常'))
				}
			},
			fail(err) {
				console.error('[DeepSeek] 网络错误:', err)
				uni.showToast({ title: '网络异常 ' + (err.errMsg || ''), icon: 'none', duration: 3000 })
				reject(err)
			}
		})
	})
}
