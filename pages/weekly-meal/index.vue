<template>
	<view class="meal-week" :class="{ 'theme-dark': isDark }">
		<!-- 顶部栏 -->
		<view class="top-bar" :style="navBarStyle">
			<text class="top-back" @tap="goBack">‹</text>
			<text class="top-title">本周餐计划</text>
			<view class="top-right">
				<view class="top-btn" @tap="copyLastWeek">
					<app-icon name="task" :size="30" color="#999" />
				</view>
			</view>
		</view>

		<!-- 周范围 + 切换 -->
		<view class="week-nav">
			<text class="nav-arrow" @tap="prevWeek">‹</text>
			<text class="nav-range">{{ rangeText }}</text>
			<text class="nav-arrow" @tap="nextWeek">›</text>
		</view>

		<!-- 按天分组：每天一张卡片，卡内 4 个餐次，每餐独占整行可铺开多道菜 -->
		<scroll-view class="day-list" scroll-y>
			<!-- 内层容器承载 padding：scroll-view 直接加 padding 会导致内容宽度溢出 / 底部滚不到 -->
			<view class="day-list-inner">
				<view
					v-for="(wd, di) in weekDays"
					:key="di"
					class="day-card"
					:class="{ 'day-card--today': wd.isToday }"
				>
					<view class="day-head">
						<view class="day-head-left">
							<text class="day-name" :class="{ 'day-name--today': wd.isToday }">{{ wd.label }}</text>
							<text class="day-date">{{ wd.dateText }}</text>
						</view>
						<view class="day-progress" v-if="wd.total">
							已吃 {{ wd.done }}/{{ wd.total }}
						</view>
					</view>
	
					<view
						v-for="meal in meals"
						:key="meal.id"
						class="meal-block"
						@tap="openModal(di, meal.id)"
					>
						<view class="meal-label">
							<view class="meal-dot" :style="{ background: meal.color }"></view>
							<text class="meal-name">{{ meal.name }}</text>
						</view>
						<view class="dish-wrap">
							<template v-if="plan[di][meal.id].length">
								<view
									v-for="(dish, i) in plan[di][meal.id]"
									:key="i"
									class="dish-chip"
									:class="{ 'dish-chip--done': dish.done }"
									@tap.stop="toggleDish(di, meal.id, i)"
								>
									<view class="dish-check" :class="{ 'dish-check--done': dish.done }">
										<text v-if="dish.done" class="dish-tick">✓</text>
									</view>
									<text class="dish-text">{{ dish.name }}</text>
								</view>
							</template>
							<text v-else class="dish-empty">+ 添加</text>
						</view>
					</view>
				</view>
		</view>
		</scroll-view>

		<!-- 底部进度栏 -->
		<view class="bottom-bar safe-area-bottom">
			<view class="progress">
				<text class="progress-num">{{ doneCount }}</text>
				<text class="progress-total">/ {{ totalCount }} 已打卡</text>
			</view>
			<view class="copy-btn" @tap="copyLastWeek">复制上周计划</view>
		</view>

		<!-- 菜单管理弹窗（与 date-detail-modal 风格统一） -->
		<meal-detail-modal
			:visible="modal.open"
			:weekday-label="modalWeekday"
			:date-text="modalDate"
			:meal-name="modalMealName"
			:dishes="currentDishes"
			@close="closeModal"
			@toggle="onToggle"
			@remove="onRemove"
			@add="onAdd"
			@clear="onClear"
		/>
	</view>
</template>

<script>
import { ref, reactive, computed, watch } from 'vue'
import { getTheme } from '@/store/theme.js'
import AppIcon from '@/components/app-icon/index.vue'
import MealDetailModal from '@/components/meal-detail-modal/index.vue'

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const MEALS = [
	{ id: 'breakfast', name: '早餐', color: '#2196F3' },
	{ id: 'lunch', name: '午餐', color: '#FF9800' },
	{ id: 'dinner', name: '晚餐', color: '#5856D6' },
	{ id: 'snack', name: '加餐', color: '#4CAF50' }
]

// 本地存储 key 前缀，按周（周一日期）区分，如 weekly-meal:2026-07-13
const STORAGE_PREFIX = 'weekly-meal:'

function emptyPlan() {
	const p = []
	for (let d = 0; d < 7; d++) {
		p.push({})
		MEALS.forEach(m => { p[d][m.id] = [] })
	}
	return p
}

// 偏移 offset 周的周一（0 = 本周）
function mondayOf(offset) {
	const now = new Date()
	const dow = now.getDay() === 0 ? 7 : now.getDay()
	const monday = new Date(now)
	monday.setDate(now.getDate() - dow + 1 + offset * 7)
	return monday
}

// 偏移周对应的存储 key（以周一日期为标识）
function weekKey(offset) {
	const m = mondayOf(offset)
	const p = (n) => String(n).padStart(2, '0')
	return `${STORAGE_PREFIX}${m.getFullYear()}-${p(m.getMonth() + 1)}-${p(m.getDate())}`
}

// 从本地读取某周计划；无数据返回空计划
function loadPlan(offset) {
	const raw = uni.getStorageSync(weekKey(offset))
	let data = null
	if (raw) {
		try { data = JSON.parse(raw) } catch (e) { data = null }
	}
	if (!data || !Array.isArray(data) || data.length !== 7) return emptyPlan()
	for (let d = 0; d < 7; d++) {
		if (!data[d] || typeof data[d] !== 'object') return emptyPlan()
		MEALS.forEach(m => {
			if (!Array.isArray(data[d][m.id])) data[d][m.id] = []
		})
	}
	return data
}

// 将某周计划写入本地（JSON 序列化）
function savePlan(plan, offset) {
	uni.setStorageSync(weekKey(offset), JSON.stringify(plan))
}

export default {
	components: { AppIcon, MealDetailModal },
	setup() {
		const isDark = ref(getTheme() === 'dark')
		const meals = MEALS
		// 默认加载本周数据；无本地数据则为空计划
		const plan = reactive(loadPlan(0))
		const weekOffset = ref(0)
		const modal = reactive({ open: false, dayIndex: 0, mealId: '' })

		/* 状态栏 / 胶囊按钮适配（与首页一致） */
		const navBarStyle = computed(() => {
			const sys = uni.getSystemInfoSync()
			const statusBarHeight = sys.statusBarHeight || 0
			try {
				// #ifdef MP-WEIXIN
				const menu = uni.getMenuButtonBoundingClientRect()
				if (menu && menu.bottom) {
					const navHeight = menu.bottom + 8
					const padRight = sys.windowWidth - menu.left + 12
					return {
						paddingTop: statusBarHeight + 'px',
						height: (navHeight - statusBarHeight) + 'px',
						lineHeight: menu.height + 'px',
						paddingLeft: '20px',
						paddingRight: padRight + 'px'
					}
				}
				// #endif
				return {
					paddingTop: statusBarHeight + 'px',
					height: '44px',
					lineHeight: '44px',
					paddingLeft: '20px',
					paddingRight: '20px'
				}
			} catch (e) {
				return {
					paddingTop: statusBarHeight + 'px',
					height: '44px',
					lineHeight: '44px',
					paddingLeft: '20px',
					paddingRight: '20px'
				}
			}
		})

		const rangeText = computed(() => {
			const monday = mondayOf(weekOffset.value)
			const sunday = new Date(monday)
			sunday.setDate(monday.getDate() + 6)
			const f = (d) => `${d.getMonth() + 1}/${d.getDate()}`
			return `${f(monday)} – ${f(sunday)}`
		})

		// 每天：标签 + 日期 + 是否今天 + 当天打卡汇总
		const weekDays = computed(() => {
			const monday = mondayOf(weekOffset.value)
			const todayKey = new Date().toDateString()
			const arr = []
			for (let i = 0; i < 7; i++) {
				const d = new Date(monday)
				d.setDate(monday.getDate() + i)
				let done = 0
				let total = 0
				MEALS.forEach(m => plan[i][m.id].forEach((x) => { total++; if (x.done) done++ }))
				arr.push({
					label: WEEKDAY_LABELS[i],
					dateText: `${d.getMonth() + 1}/${d.getDate()}`,
					isToday: d.toDateString() === todayKey,
					done,
					total
				})
			}
			return arr
		})

		const doneCount = computed(() => {
			let n = 0
			plan.forEach(day => MEALS.forEach(m => day[m.id].forEach(d => { if (d.done) n++ })))
			return n
		})
		const totalCount = computed(() => {
			let n = 0
			plan.forEach(day => MEALS.forEach(m => n += day[m.id].length))
			return n
		})

		// 弹窗数据：取当前打开的某天某餐的菜品数组（响应式引用）
		const currentDishes = computed(() =>
			modal.open ? plan[modal.dayIndex][modal.mealId] : []
		)
		const modalWeekday = computed(() =>
			modal.open ? weekDays.value[modal.dayIndex].label : ''
		)
		const modalDate = computed(() =>
			modal.open ? weekDays.value[modal.dayIndex].dateText : ''
		)
		const modalMealName = computed(() => {
			if (!modal.open) return ''
			const m = meals.find(x => x.id === modal.mealId)
			return m ? m.name : ''
		})

		// 切换周：从本地读取目标周数据，无则空计划
		watch(weekOffset, () => {
			const next = loadPlan(weekOffset.value)
			MEALS.forEach(m => {
				for (let d = 0; d < 7; d++) plan[d][m.id] = next[d][m.id]
			})
		})

		// 任何改动（增删菜、打卡、复制、切周）即时持久化到本地
		watch(plan, () => savePlan(plan, weekOffset.value), { deep: true, flush: 'sync' })
		// 卡片上直接点菜品：翻转打卡状态（stop 阻止冒泡到餐次区块，避免误开弹窗）
		function toggleDish(di, mealId, i) {
			plan[di][mealId][i].done = !plan[di][mealId][i].done
		}

		// 打开菜单管理弹窗
		function openModal(di, mealId) {
			modal.dayIndex = di
			modal.mealId = mealId
			modal.open = true
		}
		function closeModal() {
			modal.open = false
		}

		// 弹窗内操作回传（直接改动 plan，响应式同步到卡片与弹窗）
		function onToggle(i) {
			const list = plan[modal.dayIndex][modal.mealId]
			list[i].done = !list[i].done
		}
		function onRemove(i) {
			plan[modal.dayIndex][modal.mealId].splice(i, 1)
		}
		function onAdd(name) {
			plan[modal.dayIndex][modal.mealId].push({ name, done: false })
		}
		// 清空当前餐次全部菜品
		function onClear() {
			plan[modal.dayIndex][modal.mealId].splice(0)
		}

		// 复制上周：读取本地上一周真实数据覆盖本周
		// 1) 上周无任何菜品时直接提示，不执行
		// 2) 本周已有数据时先弹窗确认，避免误覆盖
		// 3) 复制时重置打卡状态（上周的"已吃"不代表本周已吃）
		function copyLastWeek() {
			const last = loadPlan(weekOffset.value - 1)
			let count = 0
			MEALS.forEach(m => {
				for (let d = 0; d < 7; d++) count += last[d][m.id].length
			})
			if (!count) {
				uni.showToast({ title: '上周暂无计划', icon: 'none' })
				return
			}
			const doCopy = () => {
				MEALS.forEach(m => {
					for (let d = 0; d < 7; d++) {
						plan[d][m.id] = last[d][m.id].map(x => ({ name: x.name, done: false }))
					}
				})
				uni.showToast({ title: '已复制上周计划', icon: 'success' })
			}
			if (totalCount.value > 0) {
				uni.showModal({
					title: '复制上周计划',
					content: '将覆盖本周已添加的菜品，是否继续？',
					success: (res) => { if (res.confirm) doCopy() }
				})
			} else {
				doCopy()
			}
		}

		function prevWeek() { weekOffset.value-- }
		function nextWeek() { weekOffset.value++ }
		function goBack() { uni.navigateBack() }

		return {
			isDark, meals, plan, weekDays,
			navBarStyle, rangeText, doneCount, totalCount,
			modal, currentDishes, modalWeekday, modalDate, modalMealName,
			toggleDish, openModal, closeModal, onToggle, onRemove, onAdd, onClear,
			copyLastWeek, prevWeek, nextWeek, goBack
		}
	}
}
</script>

<style lang="scss" scoped>
.meal-week {
	background: #fff;
	height: 100vh;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
}
.meal-week.theme-dark { background: #1c1c1e; }

/* 顶部栏 */
.top-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.top-back {
	font-size: 52rpx;
	font-weight: 200;
	color: #1a1a1a;
	width: 60rpx;
}
.theme-dark .top-back { color: #e5e5e7; }
.top-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #1a1a1a;
}
.theme-dark .top-title { color: #e5e5e7; }
.top-right { display: flex; }
.top-btn {
	margin-left: 10rpx;
	width: 64rpx;
	height: 64rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: #f8f8f8;
}
.theme-dark .top-btn { background: #2c2c2e; }

/* 周切换 */
.week-nav {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 10rpx 0 16rpx;
}
.nav-arrow {
	font-size: 48rpx;
	font-weight: 200;
	color: #999;
	padding: 0 36rpx;
	line-height: 1;
}
.theme-dark .nav-arrow { color: #8e8e93; }
.nav-range {
	font-size: 30rpx;
	font-weight: 600;
	color: #1a1a1a;
}
.theme-dark .nav-range { color: #e5e5e7; }

/* 日期列表 */
.day-list {
	flex: 1;
	min-height: 0;
}

.day-list-inner {
	padding: 0 24rpx 20rpx;
}

.day-card {
	background: #f8f8f8;
	border-radius: 20rpx;
	margin-bottom: 20rpx;
	overflow: hidden;
}
.theme-dark .day-card { background: #2c2c2e; }

.day-card--today {
	background: rgba(0, 122, 255, 0.06);
}
.theme-dark .day-card--today {
	background: rgba(10, 132, 255, 0.2);
}

.day-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 22rpx 26rpx 16rpx;
	border-bottom: 1rpx solid #eee;
}
.theme-dark .day-head { border-bottom-color: #38383a; }
.day-head-left { display: flex; align-items: baseline; }
.day-name {
	font-size: 30rpx;
	font-weight: 700;
	color: #1a1a1a;
}
.theme-dark .day-name { color: #e5e5e7; }
.day-name--today { color: #007aff; }
.day-date {
	font-size: 24rpx;
	color: #999;
	margin-left: 12rpx;
}
.theme-dark .day-date { color: #8e8e93; }
.day-progress {
	font-size: 22rpx;
	color: #1D9E75;
	font-weight: 600;
}

/* 餐次区块 */
.meal-block {
	display: flex;
	align-items: flex-start;
	padding: 18rpx 26rpx;
	border-bottom: 1rpx solid #eee;
}
.meal-block:last-child { border-bottom: none; }
.theme-dark .meal-block { border-bottom-color: #38383a; }

.meal-label {
	width: 96rpx;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	padding-top: 6rpx;
}
.meal-dot {
	width: 14rpx;
	height: 14rpx;
	border-radius: 50%;
	margin-right: 10rpx;
	flex-shrink: 0;
}
.meal-name {
	font-size: 26rpx;
	font-weight: 600;
	color: #1a1a1a;
}
.theme-dark .meal-name { color: #e5e5e7; }

.dish-wrap {
	flex: 1;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	min-height: 52rpx;
}

.dish-chip {
	display: inline-flex;
	align-items: center;
	background: #fff;
	border-radius: 30rpx;
	padding: 10rpx 18rpx;
	margin: 0 12rpx 12rpx 0;
}
.theme-dark .dish-chip { background: #3a3a3c; }
.dish-check {
	width: 30rpx;
	height: 30rpx;
	border-radius: 50%;
	border: 2rpx solid #ccc;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}
.dish-check--done {
	background: #1D9E75;
	border-color: #1D9E75;
}
.dish-tick {
	font-size: 20rpx;
	color: #fff;
	line-height: 1;
}
.dish-text {
	font-size: 26rpx;
	color: #1a1a1a;
	margin-left: 10rpx;
}
.theme-dark .dish-text { color: #e5e5e7; }
.dish-chip--done {
	background: rgba(29, 158, 117, .12);
}
.dish-chip--done .dish-text {
	color: #999;
	text-decoration: line-through;
}
.dish-empty {
	font-size: 24rpx;
	color: #bbb;
	padding: 8rpx 0;
}
.theme-dark .dish-empty { color: #636366; }

/* 底部进度栏 */
.bottom-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 18rpx 30rpx;
	background: #fff;
	border-top: 1rpx solid #f0f0f0;
}
.theme-dark .bottom-bar { background: #1c1c1e; border-top-color: #38383a; }
.progress-num {
	font-size: 34rpx;
	font-weight: 700;
	color: #1D9E75;
}
.progress-total {
	font-size: 24rpx;
	color: #999;
	margin-left: 6rpx;
}
.copy-btn {
	padding: 14rpx 32rpx;
	border-radius: 30rpx;
	background: #1a1a1a;
	color: #fff;
	font-size: 24rpx;
	font-weight: 600;
}
.theme-dark .copy-btn { background: #e5e5e7; color: #1c1c1e; }
</style>
