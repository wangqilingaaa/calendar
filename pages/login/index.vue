<template>
	<view class="login-page" :class="{ 'login-dark': isDark }">
		<view class="login-card">
			<!-- 标题 -->
			<view class="login-header">
				<text class="login-title">{{ isRegister ? '注册' : '登录' }}</text>
				<text class="login-sub">日历日记 · 记录每一天</text>
			</view>

			<!-- 微信一键登录 -->
			<view class="wechat-btn" @tap="handleWechatLogin">
				<view class="wechat-icon">W</view>
				<text>微信一键登录</text>
			</view>

			<!-- 分割线 -->
			<view class="divider">
				<view class="divider-line"></view>
				<text class="divider-text">或使用账号密码</text>
				<view class="divider-line"></view>
			</view>

			<!-- 表单 -->
			<view class="form">
				<input
					class="input"
					v-model="username"
					placeholder="请输入用户名"
					:maxlength="20"
				/>
				<input
					class="input"
					v-model="password"
					placeholder="请输入密码"
					:password="true"
					:maxlength="20"
				/>
				<!-- 注册时可选填身份标签 -->
				<input
					v-if="isRegister"
					class="input"
					v-model="identityTag"
					placeholder="身份标签（选填）"
					:maxlength="20"
				/>
				<!-- 注册时可选填性别 -->
				<view v-if="isRegister" class="gender-row">
					<text class="gender-label">性别（选填）</text>
					<view class="gender-options">
						<text
							class="gender-tag"
							:class="{ 'gender-tag--active': gender === '男' }"
							@tap="toggleGender('男')"
						>男</text>
						<text
							class="gender-tag"
							:class="{ 'gender-tag--active': gender === '女' }"
							@tap="toggleGender('女')"
						>女</text>
					</view>
				</view>
				<view class="submit-btn" @tap="handleSubmit">
					<text>{{ isRegister ? '注册' : '登录' }}</text>
				</view>
			</view>

			<!-- 切换 -->
			<view class="switch-row">
				<text class="switch-link" @tap="isRegister = !isRegister">
					{{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
				</text>
			</view>
		</view>
	</view>
</template>

<script>
import { ref } from 'vue'
import { login, register, wechatLogin } from '@/api/auth.js'
import { setAuth, checkAuth } from '@/store/auth.js'
import { getTheme } from '@/store/theme.js'

export default {
	onLoad() {
		// 已登录则直接进入主页
		if (checkAuth()) {
			uni.reLaunch({ url: '/pages/index/index' })
		}
	},
	setup() {
		const isDark = ref(getTheme() === 'dark')
		const isRegister = ref(false)
		const username = ref('')
		const password = ref('')
		const identityTag = ref('')
		const gender = ref('')

		function toggleGender(val) {
			gender.value = gender.value === val ? '' : val
		}

		async function handleSubmit() {
			if (!username.value.trim()) {
				uni.showToast({ title: '请输入用户名', icon: 'none' })
				return
			}
			if (!password.value) {
				uni.showToast({ title: '请输入密码', icon: 'none' })
				return
			}

			try {
				let data
				if (isRegister.value) {
					data = await register(
						username.value.trim(),
						password.value,
						identityTag.value.trim(),
						gender.value
					)
					if (!data || !data.id) throw new Error('注册失败')
					// 注册成功后自动登录
					data = await login(username.value.trim(), password.value)
				} else {
					data = await login(username.value.trim(), password.value)
				}

				if (data && data.token) {
					setAuth(data.token, data)
					uni.showToast({ title: '登录成功', icon: 'success' })
					setTimeout(() => {
						uni.reLaunch({ url: '/pages/index/index' })
					}, 500)
				}
			} catch (e) {
				// 错误已在 request 层提示
			}
		}

		async function handleWechatLogin() {
			try {
				const data = await wechatLogin()
				if (data && data.token) {
					setAuth(data.token, data)
					uni.showToast({ title: '登录成功', icon: 'success' })
					setTimeout(() => {
						uni.reLaunch({ url: '/pages/index/index' })
					}, 500)
				}
			} catch (e) {
				// 错误已在 request 层提示
			}
		}

		return {
			isDark, isRegister,
			username, password,
			identityTag, gender, toggleGender,
			handleSubmit, handleWechatLogin
		}
	}
}
</script>

<style lang="scss" scoped>
.login-page {
	min-height: 100vh;
	background: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40rpx;
}
.login-dark { background: #1c1c1e; }

.login-card {
	width: 100%;
	max-width: 600rpx;
}

.login-header {
	text-align: center;
	margin-bottom: 60rpx;
}
.login-title {
	font-size: 48rpx;
	font-weight: 700;
	color: #1a1a1a;
	display: block;
}
.login-dark .login-title { color: #e5e5e7; }
.login-sub {
	font-size: 26rpx;
	color: #999;
	margin-top: 12rpx;
	display: block;
}
.login-dark .login-sub { color: #8e8e93; }

/* 微信按钮 */
.wechat-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100rpx;
	background: #07c160;
	border-radius: 50rpx;
	font-size: 32rpx;
	color: #fff;
	font-weight: 600;
	box-shadow: 0 8rpx 24rpx rgba(7,193,96,.25);
}
.wechat-btn:active { opacity: .85; }
.wechat-icon {
	width: 48rpx;
	height: 48rpx;
	background: #fff;
	color: #07c160;
	border-radius: 50%;
	font-size: 26rpx;
	font-weight: 700;
	line-height: 48rpx;
	text-align: center;
	margin-right: 16rpx;
}

/* 分割线 */
.divider {
	display: flex;
	align-items: center;
	margin: 40rpx 0;
}
.divider-line {
	flex: 1;
	height: 1rpx;
	background: #eee;
}
.login-dark .divider-line { background: #38383a; }
.divider-text {
	font-size: 22rpx;
	color: #999;
	padding: 0 24rpx;
}
.login-dark .divider-text { color: #8e8e93; }

/* 表单 */
.form {
	display: flex;
	flex-direction: column;
}
.input {
	height: 100rpx;
	border: 2rpx solid #eee;
	border-radius: 20rpx;
	padding: 0 32rpx;
	font-size: 28rpx;
	margin-bottom: 20rpx;
	background: #f8f8f8;
	color: #1a1a1a;
}
.login-dark .input {
	background: #2c2c2e;
	border-color: #48484a;
	color: #e5e5e7;
}
.input:focus {
	border-color: #007aff;
	background: #fff;
}

.submit-btn {
	height: 100rpx;
	background: #1a1a1a;
	border-radius: 50rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	color: #fff;
	font-weight: 600;
	margin-top: 12rpx;
}
.submit-btn:active { opacity: .8; }
.login-dark .submit-btn {
	background: #e5e5e7;
	color: #1c1c1e;
}

/* 性别选择 */
.gender-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20rpx;
	padding: 0 16rpx;
}
.gender-label {
	font-size: 26rpx;
	color: #999;
}
.login-dark .gender-label { color: #8e8e93; }
.gender-options {
	display: flex;
	gap: 16rpx;
}
.gender-tag {
	font-size: 26rpx;
	color: #666;
	padding: 10rpx 36rpx;
	border-radius: 40rpx;
	border: 2rpx solid #eee;
	background: #f8f8f8;
}
.login-dark .gender-tag {
	color: #c7c7cc;
	border-color: #48484a;
	background: #2c2c2e;
}
.gender-tag--active {
	color: #fff !important;
	background: #007aff !important;
	border-color: #007aff !important;
}

/* 切换 */
.switch-row {
	text-align: center;
	margin-top: 36rpx;
}
.switch-link {
	font-size: 26rpx;
	color: #007aff;
}
.login-dark .switch-link { color: #0a84ff; }
</style>
