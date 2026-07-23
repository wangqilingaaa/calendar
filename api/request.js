/**
 * HTTP 请求封装 — 基于 uni.request
 *
 * 约定：
 * - 后端统一响应 { code: 0, message: "success", data: ... }
 * - code !== 0 视为业务错误，抛出异常
 * - 自动从 storage 注入 Authorization: Bearer <token>
 */
import { API_BASE } from './config.js'

const STORAGE_TOKEN_KEY = 'auth_token'

/** 获取存储的 token */
export function getToken() {
	try { return uni.getStorageSync(STORAGE_TOKEN_KEY) || '' } catch (_) { return '' }
}

/** 保存 token */
export function saveToken(token) {
	uni.setStorageSync(STORAGE_TOKEN_KEY, token)
}

/** 清除 token */
export function clearToken() {
	uni.removeStorageSync(STORAGE_TOKEN_KEY)
}

/** 是否已登录 */
export function isLoggedIn() {
	return !!getToken()
}

/**
 * 发起请求
 * @param {string} method  GET|POST|DELETE
 * @param {string} url     路径，如 "/diary"
 * @param {object} data    body（GET 时转为 query params）
 * @param {object} options 额外选项 { needAuth, showLoading }
 */
export function request(method, url, data = {}, options = {}) {
	const { needAuth = true, showLoading = false } = options

	const fullUrl = API_BASE + url

	// 🔍 调试日志
	console.log(`[API] ${method} ${fullUrl}`, data)

	const header = { 'Content-Type': 'application/json' }
	if (needAuth) {
		const token = getToken()
		if (token) header['Authorization'] = 'Bearer ' + token
	}

	if (showLoading) {
		uni.showLoading({ title: '加载中...', mask: true })
	}

	return new Promise((resolve, reject) => {
		uni.request({
			url: fullUrl,
			method,
			header,
			data,
			success(res) {
				if (showLoading) uni.hideLoading()
				console.log(`[API] ${method} ${fullUrl} →`, res.statusCode, JSON.stringify(res.data).substring(0, 200))
				const body = res.data
				if (body && body.code === 0) {
					resolve(body.data)
				} else {
					const msg = (body && body.message) || '请求失败'
					console.warn(`[API] 业务错误: ${msg}`)
					uni.showToast({ title: msg, icon: 'none' })
					reject(new Error(msg))
				}
			},
			fail(err) {
				if (showLoading) uni.hideLoading()
				console.error(`[API] ${method} ${fullUrl} 网络错误:`, JSON.stringify(err))
				uni.showToast({ title: '网络异常 ' + (err.errMsg || ''), icon: 'none', duration: 3000 })
				reject(err)
			}
		})
	})
}

/** 快捷方法 */
export const get = (url, params, opts) => request('GET', url, params, opts)
export const post = (url, data, opts) => request('POST', url, data, opts)
export const del = (url, data, opts) => request('DELETE', url, data, opts)
export const put = (url, data, opts) => request('PUT', url, data, opts)
