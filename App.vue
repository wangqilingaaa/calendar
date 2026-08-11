<script setup>
import { onLaunch } from '@dcloudio/uni-app'
import { checkAuth } from '@/store/auth.js'

// App.vue 改成 setup 结构后，应用级生命周期要改用 uni-app 提供的组合式 API，
// 这样可以保持启动、显示、隐藏时机和原来完全一致。
onLaunch(() => {
	// 检查登录态，未登录则跳转登录页
	if (!checkAuth()) {
		uni.reLaunch({ url: '/pages/login/index' })
	}
})
</script>

<style lang="scss">
/* Remix Icon 图标库 */
@import '@/static/fonts/remixicon.css';

/* ====== 全局 CSS 变量（中性主题默认值） ====== */
page {
	/* 页面基础色 */
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

	/* 性别主题色（默认使用中性主题）
                 * 这一轮整体下调了饱和度和阴影透明度，
                 * 目的是保留主题识别度，同时降低“颜色扑面而来”的感觉。
                 */
	--theme-primary: #9389de;
	--theme-primary-strong: #8479d2;
	--theme-secondary: #95afe4;
	--theme-soft-bg: rgba(147, 137, 222, 0.08);
	--theme-soft-bg-dark: rgba(147, 137, 222, 0.14);
	--theme-ring: rgba(147, 137, 222, 0.14);
	--theme-card-start: rgba(255, 255, 255, 0.98);
	--theme-card-end: rgba(247, 245, 252, 0.97);
	--theme-card-start-dark: rgba(45, 42, 53, 0.98);
	--theme-card-end-dark: rgba(37, 34, 45, 0.98);
	--theme-page-top: #faf8fd;
	--theme-page-mid: #f5f2fa;
	--theme-page-bottom: #fcfbfe;
	--theme-page-top-dark: #17151c;
	--theme-page-mid-dark: #1d1a24;
	--theme-page-bottom-dark: #231f2b;

	background-color: var(--bg);
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
		'PingFang SC', 'Microsoft YaHei', sans-serif;
	font-size: $uni-font-size-base;
	color: var(--text-primary);
	-webkit-font-smoothing: antialiased;
	transition: background-color 0.3s, color 0.3s;
}

/* ====== 资料主题：男 ====== */
.theme-male {
	--theme-primary: #78a1df;
	--theme-primary-strong: #6b93d4;
	--theme-secondary: #8cb7e8;
	--theme-soft-bg: rgba(120, 161, 223, 0.08);
	--theme-soft-bg-dark: rgba(120, 161, 223, 0.14);
	--theme-ring: rgba(120, 161, 223, 0.14);
	--theme-card-start: rgba(255, 255, 255, 0.98);
	--theme-card-end: rgba(243, 248, 252, 0.97);
	--theme-card-start-dark: rgba(40, 46, 56, 0.98);
	--theme-card-end-dark: rgba(33, 38, 47, 0.98);
	--theme-page-top: #f7fafd;
	--theme-page-mid: #eff4f9;
	--theme-page-bottom: #fbfcfe;
	--theme-page-top-dark: #151922;
	--theme-page-mid-dark: #1a1f28;
	--theme-page-bottom-dark: #20252e;
}

/* ====== 资料主题：女 ====== */
.theme-female {
	--theme-primary: #d89ab6;
	--theme-primary-strong: #ca8cab;
	--theme-secondary: #b59bdd;
	--theme-soft-bg: rgba(216, 154, 182, 0.08);
	--theme-soft-bg-dark: rgba(216, 154, 182, 0.14);
	--theme-ring: rgba(216, 154, 182, 0.14);
	--theme-card-start: rgba(255, 255, 255, 0.98);
	--theme-card-end: rgba(252, 245, 248, 0.97);
	--theme-card-start-dark: rgba(54, 43, 49, 0.98);
	--theme-card-end-dark: rgba(45, 36, 41, 0.98);
	--theme-page-top: #fdf8fa;
	--theme-page-mid: #f8f0f4;
	--theme-page-bottom: #fefbfd;
	--theme-page-top-dark: #1d161a;
	--theme-page-mid-dark: #241d22;
	--theme-page-bottom-dark: #2b2428;
}

/* ====== 资料主题：未设置 / 中性 ====== */
.theme-neutral {
	--theme-primary: #9389de;
	--theme-primary-strong: #8479d2;
	--theme-secondary: #95afe4;
	--theme-soft-bg: rgba(147, 137, 222, 0.08);
	--theme-soft-bg-dark: rgba(147, 137, 222, 0.14);
	--theme-ring: rgba(147, 137, 222, 0.14);
	--theme-card-start: rgba(255, 255, 255, 0.98);
	--theme-card-end: rgba(247, 245, 252, 0.97);
	--theme-card-start-dark: rgba(45, 42, 53, 0.98);
	--theme-card-end-dark: rgba(37, 34, 45, 0.98);
	--theme-page-top: #faf8fd;
	--theme-page-mid: #f5f2fa;
	--theme-page-bottom: #fcfbfe;
	--theme-page-top-dark: #17151c;
	--theme-page-mid-dark: #1d1a24;
	--theme-page-bottom-dark: #231f2b;
}

/* 按钮点击态重置 */
view,
text {
	-webkit-tap-highlight-color: transparent;
}

/* 安全区域适配 */
.safe-area-bottom {
	padding-bottom: constant(safe-area-inset-bottom);
	padding-bottom: env(safe-area-inset-bottom);
}
</style>
