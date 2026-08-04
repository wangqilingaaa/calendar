<template>
	<view class="meal-week" :class="{ 'theme-dark': isDark }">
		<!-- 顶部栏 -->
		<view class="top-bar" :style="navBarStyle">
			<text class="top-back" @tap="goBack">‹</text>
			<text class="top-title">本周餐计划</text>
		</view>

		<!-- 周范围 + 切换 -->
		<view class="week-nav">
			<text class="nav-arrow" @tap="prevWeek">‹</text>
			<text class="nav-range">{{ rangeText }}</text>
			<text class="nav-arrow" @tap="nextWeek">›</text>
		</view>

		<!-- 加载中提示 -->
		<view v-if="loading" class="loading-tip">加载中…</view>

		<!-- 本周原材料清单（显示在周日期下方） -->
		<view class="materials-bar">
			<view class="materials-head">
				<text class="materials-title">原材料</text>
				<text class="materials-count" v-if="materials.length">已购 {{ purchasedCount }}/{{ materials.length }}</text>
			</view>
			<view class="materials-list" v-if="materials.length">
				<view
					v-for="(mt, i) in materials"
					:key="mt.id || i"
					class="material-chip"
					:class="{ 'material-chip--done': mt.purchased }"
					@tap="toggleMaterial(i)"
				>
					<view class="material-check" :class="{ 'material-check--done': mt.purchased }">
						<text v-if="mt.purchased" class="material-tick">✓</text>
					</view>
					<text class="material-text">{{ mt.name }}</text>
					<text class="material-del" @tap.stop="removeMaterial(i)">×</text>
				</view>
			</view>
			<view class="materials-add">
				<input
					class="material-input"
					v-model="materialInput"
					placeholder="添加食材，如 鸡蛋"
					confirm-type="done"
					@confirm="addMaterial"
				/>
				<text class="material-add-btn" @tap="addMaterial">+</text>
			</view>
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
import {
	getMealPlan,
	createMealPlan,
	copyLastWeekPlan,
	addMealPlanItem,
	updateMealPlanItem,
	deleteMealPlanItem,
	addMealPlanMaterial,
	updateMealPlanMaterial,
	deleteMealPlanMaterial
} from '@/api/meal-plan.js'
import MealDetailModal from '@/components/meal-detail-modal/index.vue'

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const MEALS = [
	{ id: 'breakfast', name: '早餐', color: '#2196F3' },
	{ id: 'lunch', name: '午餐', color: '#FF9800' },
	{ id: 'dinner', name: '晚餐', color: '#5856D6' },
	{ id: 'snack', name: '加餐', color: '#4CAF50' }
]

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

// Date → yyyy-mm-dd（API 的 week_start_date 格式）
function formatDate(d) {
	const p = (n) => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 后端条目 → 页面菜品（兼容添加接口的大写字段 ID/dish_name 与查询接口的小写字段 id/name）
function toDish(item) {
	return {
		id: item.id != null ? item.id : item.ID,
		name: item.name != null ? item.name : item.dish_name,
		done: !!item.done
	}
}

// 后端条目 → 页面原材料（兼容添加接口的大写字段 ID 与查询接口的小写字段 id）
function toMaterial(item) {
	return {
		id: item.id != null ? item.id : item.ID,
		name: item.name,
		purchased: !!item.purchased
	}
}

export default {
	components: { MealDetailModal },
	setup() {
		const isDark = ref(getTheme() === 'dark')
		const meals = MEALS
		// 周计划数据来自服务端，初始为空，进入页面后异步加载
		const plan = reactive(emptyPlan())
		const weekOffset = ref(0)
		// 当前周计划主键；0 = 该周尚未在服务端创建
		const planId = ref(0)
		const loading = ref(false)
		const modal = reactive({ open: false, dayIndex: 0, mealId: '' })
		// 本周原材料清单（随周计划一起从服务端加载）
		const materials = reactive([])
		const materialInput = ref('')

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
		const purchasedCount = computed(() => {
			let n = 0
			materials.forEach(m => { if (m.purchased) n++ })
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

		// 将服务端周计划详情写入页面（归一化为 7 天 × 4 餐次菜品数组 + 原材料清单）
		function applyDetail(detail) {
			if (!detail || !Array.isArray(detail.plan) || detail.plan.length !== 7) {
				planId.value = 0
				MEALS.forEach(m => {
					for (let d = 0; d < 7; d++) plan[d][m.id] = []
				})
				materials.splice(0)
				return
			}
			planId.value = detail.exists ? detail.id : 0
			MEALS.forEach(m => {
				for (let d = 0; d < 7; d++) {
					const day = detail.plan[d] || {}
					plan[d][m.id] = (day[m.id] || []).map(toDish)
				}
			})
			// 仅在服务端返回了 materials 时替换，避免缺字段时误清空当前清单
			if (Array.isArray(detail.materials)) {
				materials.splice(0, materials.length, ...detail.materials.map(toMaterial))
			}
		}

		// 从服务端加载目标周（切周时自动触发）
		async function loadWeek(offset) {
			loading.value = true
			const target = formatDate(mondayOf(offset))
			try {
				const detail = await getMealPlan(target)
				// 期间用户又切了周：丢弃过期结果，避免旧数据覆盖新周
				if (weekOffset.value !== offset) return
				applyDetail(detail)
			} catch (e) {
				// 加载失败：清掉旧周主键，避免后续添加落错周（错误已由请求层 toast）
				if (weekOffset.value === offset) planId.value = 0
			} finally {
				if (weekOffset.value === offset) loading.value = false
			}
		}

		// 切换周：拉取目标周数据（同时关闭弹窗，避免弹窗静默切到新周内容）
		watch(weekOffset, () => {
			closeModal()
			loadWeek(weekOffset.value)
		})

		// 打卡翻转（卡片/弹窗共用）：乐观更新，失败回滚
		// （卡片上 stop 阻止冒泡到餐次区块，避免误开弹窗）
		// 用 _busy 互斥：请求返回前忽略再次点击，避免并发 PUT 乱序
		// （不用 .finally：低版本基础库不支持，用 then/catch 双路清理）
		function toggleDish(di, mealId, i) {
			const dish = plan[di][mealId][i]
			if (!dish || !dish.id || dish._busy) return
			const next = !dish.done
			dish.done = next
			dish._busy = true
			updateMealPlanItem(dish.id, { done: next }).then(
				() => { dish._busy = false },
				() => { dish.done = !next; dish._busy = false }
			)
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

		// 弹窗内操作回传（同步到服务端，成功后更新本地 plan）
		function onToggle(i) {
			toggleDish(modal.dayIndex, modal.mealId, i)
		}
		function onRemove(i) {
			const list = plan[modal.dayIndex][modal.mealId]
			const dish = list[i]
			if (!dish || !dish.id) return
			deleteMealPlanItem(dish.id).then(() => { list.splice(i, 1) })
		}
		// 确保当前周主表已创建，返回其 id（0 = 失败）；promise 与 planId 均绑定目标周，
		// 避免切周后把旧周主键写进 planId 导致后续添加落错周
		let ensurePlanPromise = null
		let ensurePlanTarget = ''
		function ensurePlanId(target) {
			if (planId.value) return Promise.resolve(planId.value)
			if (ensurePlanPromise && ensurePlanTarget === target) return ensurePlanPromise
			ensurePlanTarget = target
			ensurePlanPromise = (async () => {
				try {
					const created = await createMealPlan(target)
					// 请求期间用户切了周：不覆写 planId（服务端已创建，切回该周即可见）
					if (formatDate(mondayOf(weekOffset.value)) !== target) return 0
					planId.value = created.id
					return created.id
				} catch (e) {
					// 创建失败（可能已存在）：回查一次拿主键
					try {
						const detail = await getMealPlan(target)
						if (formatDate(mondayOf(weekOffset.value)) !== target) return 0
						planId.value = detail.exists ? detail.id : 0
					} catch (e2) { planId.value = 0 }
					return planId.value
				}
			})()
			// 双路清理（不用 .finally：低版本基础库不支持）；仅当缓存仍是本请求时清理，
			// 避免多周并发添加时旧请求误清新请求的共享引用
			const pending = ensurePlanPromise
			pending.then(
				() => { if (ensurePlanPromise === pending) { ensurePlanPromise = null; ensurePlanTarget = '' } },
				() => { if (ensurePlanPromise === pending) { ensurePlanPromise = null; ensurePlanTarget = '' } }
			)
			return pending
		}

		async function onAdd(name) {
			// 加载中/尚未定位到周时拒绝添加，避免数据落错周
			if (loading.value) return
			const targetOffset = weekOffset.value
			const target = formatDate(mondayOf(targetOffset))
			const di = modal.dayIndex
			const mealId = modal.mealId
			const id = await ensurePlanId(target)
			if (!id || weekOffset.value !== targetOffset) return
			try {
				const item = await addMealPlanItem(id, { dayIndex: di, mealId, name })
				// 请求期间用户切了周：菜已写入服务端旧周，仅不更新当前 UI
				if (weekOffset.value !== targetOffset) return
				plan[di][mealId].push(toDish(item))
			} catch (e) { /* 错误已由请求层 toast */ }
		}
		// 清空当前餐次全部菜品（逐个删除；部分失败时仅移除已确认删除的项，失败项保留可重试）
		// （不用 Promise.allSettled：低版本基础库不支持，用 all + then/catch 双路）
		async function onClear() {
			const list = plan[modal.dayIndex][modal.mealId]
			const ids = list.map(x => x.id).filter(Boolean)
			if (!ids.length) return
			const results = await Promise.all(ids.map(id =>
				deleteMealPlanItem(id).then(() => ({ id, ok: true }), () => ({ id, ok: false }))
			))
			const failed = new Set()
			results.forEach(r => { if (!r.ok) failed.add(r.id) })
			for (let i = list.length - 1; i >= 0; i--) {
				if (list[i].id && !failed.has(list[i].id)) list.splice(i, 1)
			}
		}

		// ===== 本周原材料（显示在周日期下方） =====

		// 勾选购买：乐观更新，失败回滚（_busy 互斥防并发 PUT 乱序）
		function toggleMaterial(i) {
			const mt = materials[i]
			if (!mt || !mt.id || mt._busy) return
			const next = !mt.purchased
			mt.purchased = next
			mt._busy = true
			updateMealPlanMaterial(mt.id, { purchased: next }).then(
				() => { mt._busy = false },
				() => { mt.purchased = !next; mt._busy = false }
			)
		}
		async function addMaterial() {
			const name = materialInput.value.trim()
			if (!name || loading.value) return
			const targetOffset = weekOffset.value
			const target = formatDate(mondayOf(targetOffset))
			const id = await ensurePlanId(target)
			if (!id || weekOffset.value !== targetOffset) return
			try {
				const item = await addMealPlanMaterial(id, { name })
				// 请求期间切了周：材料已写入服务端旧周，仅不更新当前 UI
				if (weekOffset.value !== targetOffset) return
				materials.push(toMaterial(item))
				materialInput.value = ''
			} catch (e) { /* 错误已由请求层 toast */ }
		}
		function removeMaterial(i) {
			const mt = materials[i]
			if (!mt || !mt.id) return
			const targetOffset = weekOffset.value
			deleteMealPlanMaterial(mt.id).then(() => {
				// 切周后不操作新周列表；按 id 重新定位，避免索引错位误删
				if (weekOffset.value !== targetOffset) return
				const idx = materials.findIndex(x => x.id === mt.id)
				if (idx >= 0) materials.splice(idx, 1)
			})
		}

		// 复制上周：后端复制后返回目标周完整数据，直接刷新页面
		// 1) 本周已有数据时先弹窗确认，避免误覆盖
		// 2) 打卡状态由后端重置为 false（上周"已吃"不代表本周已吃）
		// 3) 请求期间切周则不应用结果，避免旧周数据覆盖当前周
		function copyLastWeek() {
			const targetOffset = weekOffset.value
			const doCopy = async () => {
				try {
					const detail = await copyLastWeekPlan(formatDate(mondayOf(targetOffset)))
					if (weekOffset.value !== targetOffset) return
					applyDetail(detail)
					uni.showToast({ title: '已复制上周计划', icon: 'success' })
				} catch (e) { /* 错误已由请求层 toast */ }
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

		// 进入页面加载本周计划
		loadWeek(0)

		return {
			isDark, meals, plan, loading, weekDays,
			navBarStyle, rangeText, doneCount, totalCount, purchasedCount,
			materials, materialInput,
			modal, currentDishes, modalWeekday, modalDate, modalMealName,
			toggleDish, openModal, closeModal, onToggle, onRemove, onAdd, onClear,
			toggleMaterial, addMaterial, removeMaterial,
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
	position: relative;
}
.top-back {
	font-size: 52rpx;
	font-weight: 200;
	color: #1a1a1a;
	width: 60rpx;
}
.theme-dark .top-back { color: #e5e5e7; }
.top-title {
	position: absolute;
	left: 50%;
	transform: translateX(-50%);
	font-size: 34rpx;
	font-weight: 700;
	color: #1a1a1a;
	pointer-events: none;
}
.theme-dark .top-title { color: #e5e5e7; }

/* 周切换 */
.week-nav {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 10rpx 0 16rpx;
}
.loading-tip {
	text-align: center;
	font-size: 24rpx;
	color: #999;
	padding: 20rpx 0;
}
.theme-dark .loading-tip { color: #8e8e93; }

/* 本周原材料清单 */
.materials-bar {
	margin: 0 24rpx 20rpx;
	padding: 22rpx 26rpx;
	background: #f8f8f8;
	border-radius: 20rpx;
}
.theme-dark .materials-bar { background: #2c2c2e; }
.materials-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16rpx;
}
.materials-title {
	font-size: 28rpx;
	font-weight: 700;
	color: #1a1a1a;
}
.theme-dark .materials-title { color: #e5e5e7; }
.materials-count {
	font-size: 22rpx;
	color: #1D9E75;
	font-weight: 600;
}
.materials-list {
	display: flex;
	flex-wrap: wrap;
	max-height: 240rpx;
	overflow-y: auto;
}
.material-chip {
	display: inline-flex;
	align-items: center;
	background: #fff;
	border-radius: 30rpx;
	padding: 10rpx 18rpx;
	margin: 0 12rpx 12rpx 0;
}
.theme-dark .material-chip { background: #3a3a3c; }
.material-check {
	width: 30rpx;
	height: 30rpx;
	border-radius: 50%;
	border: 2rpx solid #ccc;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}
.material-check--done {
	background: #1D9E75;
	border-color: #1D9E75;
}
.material-tick {
	font-size: 20rpx;
	color: #fff;
	line-height: 1;
}
.material-text {
	font-size: 26rpx;
	color: #1a1a1a;
	margin-left: 10rpx;
}
.theme-dark .material-text { color: #e5e5e7; }
.material-chip--done { background: rgba(29, 158, 117, .12); }
.material-chip--done .material-text {
	color: #999;
	text-decoration: line-through;
}
.material-del {
	font-size: 30rpx;
	color: #ccc;
	margin-left: 12rpx;
	padding: 0 4rpx;
	font-weight: 300;
}
.theme-dark .material-del { color: #636366; }
.materials-add {
	display: flex;
	align-items: center;
}
.material-input {
	flex: 1;
	height: 64rpx;
	border: 1px solid #eee;
	border-radius: 32rpx;
	padding: 0 24rpx;
	font-size: 24rpx;
	background: #fff;
	color: #1a1a1a;
}
.theme-dark .material-input {
	background: #3a3a3c;
	border-color: #48484a;
	color: #e5e5e7;
}
.material-add-btn {
	flex-shrink: 0;
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	background: #1a1a1a;
	color: #fff;
	font-size: 36rpx;
	font-weight: 300;
	line-height: 64rpx;
	text-align: center;
	margin-left: 14rpx;
}
.theme-dark .material-add-btn { background: #e5e5e7; color: #1c1c1e; }
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
