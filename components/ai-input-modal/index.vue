<template>
	<view class="ai-mask" :class="{ 'ai-mask--dark': isDark }" v-if="visible" @tap="onMaskTap">
		<view class="ai-sheet" @tap.stop>
			<!-- 头部 -->
			<view class="ai-head">
				<text class="ai-title">AI 智能添加</text>
				<view class="ai-close" @tap="onClose">
					<app-icon name="close" :size="32" :color="isDark ? '#8e8e93' : '#999'" />
				</view>
			</view>

			<!-- 输入区 -->
			<view class="ai-body">
				<textarea
					class="ai-textarea"
					:class="{ 'ai-textarea--dark': isDark }"
					v-model="inputValue"
					:placeholder="placeholder"
					placeholder-class="ai-placeholder"
					:maxlength="200"
					:auto-height="true"
					:focus="visible"
					confirm-type="done"
					@confirm="onConfirm"
				></textarea>
				<text class="ai-counter">{{ inputValue.length }}/200</text>
			</view>

		<!-- 示例 -->
		<view class="ai-tips">
			<text class="ai-tips-label">试试这样说：</text>
			<view v-if="tipsLoading" class="ai-chips">
				<text class="ai-chip ai-chip--loading" :class="{ 'ai-chip--dark': isDark }">AI 生成中...</text>
			</view>
			<view v-else class="ai-chips">
				<text
					v-for="(tip, idx) in tips"
					:key="idx"
					class="ai-chip"
					:class="{ 'ai-chip--dark': isDark }"
					@tap="useTip(tip)"
				>{{ tip }}</text>
			</view>
		</view>

			<!-- 底部按钮 -->
			<view class="ai-foot">
				<text class="ai-btn ai-btn--cancel" @tap="onClose">取消</text>
				<text class="ai-btn ai-btn--confirm" :class="{ disabled: !inputValue.trim() }" @tap="onConfirm">
					<app-icon name="send" :size="24" color="#fff" />
					<text>发送</text>
				</text>
			</view>
		</view>
	</view>
</template>

<script>
import { ref, watch, computed } from 'vue'
import { getTheme } from '@/store/theme.js'
import { generateTipsByMonthData } from '@/api/ai.js'
import AppIcon from '@/components/app-icon/index.vue'

/** 兼容 monthData 传 ref 或普通对象的情况 */
function unwrapMonthData(md) {
	if (md && typeof md === 'object' && md.__v_isRef) return md.value
	return md
}

const TIPS_CACHE_KEY = 'ai_tips_cache'

function todayKey() {
	const t = new Date()
	return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

function monthKey() {
	const t = new Date()
	return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`
}

function getCache() {
	try {
		const raw = uni.getStorageSync(TIPS_CACHE_KEY)
		return raw ? JSON.parse(raw) : null
	} catch (_) {
		return null
	}
}

function setCache(tips) {
	try {
		uni.setStorageSync(TIPS_CACHE_KEY, JSON.stringify({ generatedAt: todayKey(), month: monthKey(), tips }))
	} catch (_) { /* ignore */ }
}

export default {
	name: 'AiInputModal',
	components: { AppIcon },
	props: {
		visible: { type: Boolean, default: false },
		placeholder: { type: String, default: '例如：明天老公喝水 500ml' },
		monthData: { type: Object, default: () => ({}) }
	},
	emits: ['close', 'confirm'],
	setup(props, { emit }) {
		const isDark = ref(getTheme() === 'dark')
		const inputValue = ref('')
		const tips = ref([
			'明天老公喝水 500ml',
			'今晚老婆运动 30 分钟',
			'后天一起吃纪念日蛋糕',
			'今天体重 62.5kg'
		])
		const tipsLoading = ref(false)

		const resolvedMonthData = computed(() => unwrapMonthData(props.monthData))

		async function loadTips() {
			const cache = getCache()
			const md = resolvedMonthData.value
			console.log('[AI Tips] loadTips 触发，cache:', cache, 'monthData keys:', Object.keys(md || {}))
			if (cache && cache.generatedAt === todayKey() && cache.month === monthKey() && Array.isArray(cache.tips) && cache.tips.length > 0) {
				console.log('[AI Tips] 命中缓存，直接使用')
				tips.value = cache.tips.slice(0, 4)
				return
			}

			tipsLoading.value = true
		try {
			console.log('[AI Tips] 未命中缓存，开始调用后端')
			const data = await generateTipsByMonthData(md)
			console.log('[AI Tips] 后端返回:', data)
				tips.value = data
				setCache(data)
			} catch (e) {
				console.error('[AI Tips] 生成失败:', e)
				// 失败时保留兜底示例
			} finally {
				tipsLoading.value = false
			}
		}

		watch(() => props.monthData, (val) => {
			console.log('[AI Tips] props.monthData 变化，isRef:', !!(val && val.__v_isRef), 'keys:', Object.keys(unwrapMonthData(val) || {}))
		}, { deep: true, immediate: true })

		watch(() => props.visible, (v) => {
			isDark.value = getTheme() === 'dark'
			if (v) {
				inputValue.value = ''
				loadTips()
			}
		})

		function onClose() {
			emit('close')
		}

		function onMaskTap() {
			emit('close')
		}

		function onConfirm() {
			const text = inputValue.value.trim()
			if (!text) return
			emit('confirm', text)
		}

		function useTip(tip) {
			inputValue.value = tip
		}

		return {
			isDark,
			inputValue,
			tips,
			tipsLoading,
			onClose,
			onMaskTap,
			onConfirm,
			useTip
		}
	}
}
</script>

<style lang="scss" scoped>
/* ====== 遮罩 ====== */
.ai-mask {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	background: rgba(0, 0, 0, 0.45);
	z-index: 1001;
	display: flex;
	align-items: flex-end;
}

/* ====== 面板 ====== */
.ai-sheet {
	background: #fff;
	border-radius: 32rpx 32rpx 0 0;
	width: 100%;
	padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
	box-shadow: 0 -8rpx 40rpx rgba(0, 0, 0, 0.08);
}

.ai-mask--dark .ai-sheet {
	background: #1c1c1e;
	box-shadow: 0 -8rpx 40rpx rgba(0, 0, 0, 0.25);
}

/* ====== 头部 ====== */
.ai-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 24rpx;
}

.ai-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #1a1a1a;
}

.ai-mask--dark .ai-title {
	color: #e5e5e7;
}

.ai-close {
	width: 56rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: #f8f8f8;
}

.ai-mask--dark .ai-close {
	background: #2c2c2e;
}

/* ====== 输入区 ====== */
.ai-body {
	position: relative;
	margin-bottom: 20rpx;
}

.ai-textarea {
	width: 100%;
	min-height: 160rpx;
	max-height: 320rpx;
	background: #f8f8f8;
	border-radius: 20rpx;
	padding: 24rpx;
	font-size: 30rpx;
	color: #1a1a1a;
	line-height: 1.5;
	box-sizing: border-box;
}

.ai-textarea--dark {
	background: #2c2c2e;
	color: #e5e5e7;
}

.ai-placeholder {
	color: #999;
	font-size: 28rpx;
}

.ai-counter {
	position: absolute;
	bottom: 16rpx;
	right: 20rpx;
	font-size: 22rpx;
	color: #bbb;
}

.ai-mask--dark .ai-counter {
	color: #636366;
}

/* ====== 示例 ====== */
.ai-tips {
	margin-bottom: 28rpx;
}

.ai-tips-label {
	font-size: 24rpx;
	color: #999;
	display: block;
	margin-bottom: 14rpx;
}

.ai-mask--dark .ai-tips-label {
	color: #8e8e93;
}

.ai-chips {
	display: flex;
	flex-wrap: wrap;
}

.ai-chip {
	background: #f2f2f7;
	color: #555;
	font-size: 24rpx;
	padding: 10rpx 20rpx;
	border-radius: 24rpx;
	margin-right: 14rpx;
	margin-bottom: 12rpx;
}

.ai-chip--dark {
	background: #2c2c2e;
	color: #a1a1a6;
}
.ai-chip--loading {
	background: transparent;
	color: #999;
	padding-left: 0;
	padding-right: 0;
}
.ai-chip--loading.ai-chip--dark {
	background: transparent;
	color: #636366;
}

/* ====== 底部按钮 ====== */
.ai-foot {
	display: flex;
	justify-content: flex-end;
	align-items: center;
}

.ai-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 18rpx 32rpx;
	border-radius: 40rpx;
	font-size: 28rpx;
	font-weight: 600;
}

.ai-btn--cancel {
	color: #666;
	background: transparent;
	margin-right: 16rpx;
}

.ai-mask--dark .ai-btn--cancel {
	color: #8e8e93;
}

.ai-btn--confirm {
	background: #007aff;
	color: #fff;
	padding: 18rpx 36rpx;
}

.ai-btn--confirm.disabled {
	background: #b3d7ff;
}

.ai-mask--dark .ai-btn--confirm.disabled {
	background: #2c4a66;
}

.ai-btn--confirm text {
	margin-left: 8rpx;
}
</style>
