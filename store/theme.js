/**
 * 主题管理 — 黑夜模式切换 & 持久化
 */
const STORAGE_KEY = 'app_theme'

/* 读取持久化主题，默认跟随系统 */
export function getTheme() {
	try {
		const saved = uni.getStorageSync(STORAGE_KEY)
		if (saved === 'dark' || saved === 'light') return saved
	} catch (_) { /* ignore */ }
	// 跟随系统
	const sys = uni.getSystemInfoSync()
	return sys.theme || 'light'
}

export function setTheme(mode) {
	uni.setStorageSync(STORAGE_KEY, mode)
}

/* 监听系统主题变化 */
export function onSystemThemeChange(callback) {
	uni.onThemeChange(res => {
		// 仅在用户未手动选择时跟随系统
		const saved = uni.getStorageSync(STORAGE_KEY)
		if (!saved) {
			callback(res.theme)
		}
	})
}
