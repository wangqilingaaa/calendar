<script>
	import { checkAuth } from '@/store/auth.js'

	export default {
		onLaunch: function() {
			console.log('App Launch')
			// 检查登录态，未登录则跳转登录页
			if (!checkAuth()) {
				uni.reLaunch({ url: '/pages/login/index' })
			}
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style lang="scss">
	/* Remix Icon 图标库 */
	@import '@/static/fonts/remixicon.css';

	/* ====== 全局 CSS 变量 (日间默认) ====== */
	page {
		--bg: #ffffff;
		--bg-secondary: #f8f8f8;
		--text-primary: #1a1a1a;
		--text-secondary: #999999;
		--text-muted: #c0c0c0;
		--border-light: #f0f0f0;
		--border-color: #c8c7cc;
		--card-bg: #f8f8f8;
		--sheet-bg: #ffffff;
		--chip-active-bg: #f5f5f5;

		background-color: var(--bg);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
			'PingFang SC', 'Microsoft YaHei', sans-serif;
		font-size: $uni-font-size-base;
		color: var(--text-primary);
		-webkit-font-smoothing: antialiased;
		transition: background-color 0.3s, color 0.3s;
	}

	/* 按钮点击态重置 */
	view, text {
		-webkit-tap-highlight-color: transparent;
	}

	/* 安全区域适配 */
	.safe-area-bottom {
		padding-bottom: constant(safe-area-inset-bottom);
		padding-bottom: env(safe-area-inset-bottom);
	}
</style>
