<template>
	<view class="modal-mask" :class="{ 'modal-dark': isDark }" v-if="visible" @tap="$emit('close')">
		<view class="modal-sheet" @tap.stop>
			<!-- 日期标题 -->
			<view class="sheet-head">
				<text class="head-date">{{ month + 1 }}月{{ day }}日</text>
				<text class="head-weekday">{{ weekdayLabel }}</text>
			</view>

			<!-- ====== 日期状态 ====== -->
			<view class="block">
				<view class="status-row">
					<view v-for="s in statuses" :key="s.id" class="status-dot"
						:class="{ active: currentStatus === s.id }" @tap="changeStatus(s.id)">
						<view class="dot-circle"
							:style="s.color !== 'transparent' ? { backgroundColor: currentStatus === s.id ? s.color : 'transparent', borderColor: currentStatus === s.id ? s.color : '#ddd' } : { borderColor: '#ddd' }">
						</view>
						<text>{{ s.name }}</text>
					</view>
				</view>
			</view>

			<!-- ====== 事件列表 ====== -->
			<view class="block">
				<view class="block-title">
					<text>事件</text>
					<text v-if="!events.length" class="muted">— 空</text>
				</view>
				<view v-if="events.length" class="event-list">
					<view v-for="ev in events" :key="ev.id" class="event-item">
						<view class="ev-left">
							<app-icon :name="ev.type" :size="36" :color="typeColor(ev.type)" />
							<view class="ev-info">
								<text class="ev-title">{{ ev.title }}</text>
								<view class="ev-meta">
									<text class="ev-type">{{ typeName(ev.type) }}</text>
									<view class="ev-person-tag"
										:style="{ backgroundColor: personColor(ev.person) + '18', color: personColor(ev.person) }">
										{{ personName(ev.person) }}
									</view>
								</view>
								<text v-if="ev.createdAt" class="ev-time">{{ formatTime(ev.createdAt) }}</text>
							</view>
						</view>
						<view class="ev-right">
							<template v-if="countableType(ev.type) && ev.count > 0">
								<view class="count-ctrl">
									<text class="count-btn" @tap.stop="decEvent(ev)">-</text>
									<text class="count-num">{{ ev.count }}</text>
									<text class="count-btn" @tap.stop="incEvent(ev)">+</text>
								</view>
							</template>
							<text class="del-btn" @tap.stop="delEvent(ev.id)">x</text>
						</view>
					</view>
				</view>
			</view>

			<!-- ====== 添加事件 ====== -->
			<view class="block">
				<view class="block-title">添加</view>

				<!-- 人物选择 -->
				<view class="person-row">
					<view v-for="p in persons" :key="p.id" class="person-chip" :class="{ active: addPerson === p.id }"
						:style="addPerson === p.id ? { backgroundColor: p.color, borderColor: p.color, color: '#fff' } : { color: p.color, borderColor: p.color + '60' }"
						@tap="addPerson = p.id">
						<text>{{ p.name }}</text>
					</view>
				</view>

				<!-- 类型选择 -->
				<scroll-view scroll-x class="type-scroll" :show-scrollbar="false">
					<view class="type-row">
						<view v-for="t in types" :key="t.id" class="type-chip" :class="{ active: addType === t.id }"
							:style="addType === t.id ? { borderColor: t.color } : {}" @tap="addType = t.id">
							<app-icon :name="t.id" :size="32" :color="addType === t.id ? t.color : '#999'" />
							<text :style="addType === t.id ? { color: t.color } : { color: '#999' }">{{ t.name }}</text>
						</view>
					</view>
				</scroll-view>

				<!-- 输入行 -->
				<view class="add-bar">
					<input class="add-input" v-model="addTitle" :placeholder="addPlaceholder" confirm-type="done"
						@confirm="doAdd" />
					<text class="add-btn" @tap="doAdd">+</text>
				</view>
			</view>

			<!-- 底部 -->
			<view class="sheet-foot">
				<text v-if="events.length" class="foot-link danger" @tap="clearAll">清空全部</text>
				<text class="foot-link" @tap="$emit('close')">关闭</text>
			</view>
		</view>
	</view>
</template>

<script>
	import {
		ref,
		computed,
		watch
	} from 'vue'
	import {
		addEvent,
		removeEvent,
		decrementEvent,
		clearDateEvents,
		EVENT_TYPES,
		DATE_STATUSES,
		PERSONS,
		dateKey
	} from '@/store/calendar.js'
	import {
		getTheme
	} from '@/store/theme.js'
	import AppIcon from '@/components/app-icon/index.vue'
import { putDiaryStatus } from '../../api/diary'

	export default {
		components: {
			AppIcon
		},
		props: {
			year: {
				type: Number,
				required: true
			},
			month: {
				type: Number,
				required: true
			},
			day: {
				type: Number,
				required: true
			},
			status: {
				type: String,
			},
			events: {
				type: Array,
				default: () => []
			},
			visible: {
				type: Boolean,
				default: false
			}
		},
		emits: ['close', 'refresh'],
		setup(props, {
			emit
		}) {
			const statuses = DATE_STATUSES
			const types = EVENT_TYPES
			const persons = PERSONS

			const isDark = ref(getTheme() === 'dark')
			const currentStatus = ref('normal')
			const events = ref([])
			const addType = ref('water')
			const addTitle = ref('')
			const addPerson = ref('both')

			const weekdayLabel = computed(() => {
				const d = new Date(props.year, props.month, props.day)
				return '周' + ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
			})

			const addPlaceholder = computed(() => '备注（选填）')

			// 从 props.events 合并展示（可计数类型合并，不发起 API 请求）
			function updateEvents() {
				isDark.value = getTheme() === 'dark'
				const evs = props.events || []
				const merged = []
				const typeMap = {}

				evs.forEach(e => {
					const t = types.find(t => t.id === e.type)
					if (t && t.countable) {
						const key = e.type + '|' + (e.person || 'both') + '|' + e.title
						if (typeMap[key]) {
							typeMap[key].count++
						} else {
							typeMap[key] = {
								...e,
								count: 1
							}
						}
					} else {
						merged.push({
							...e,
							count: 0
						})
					}
				})

				Object.values(typeMap).forEach(v => merged.push(v))
				// 固定排序
				merged.sort((a, b) => {
					if (a.type !== b.type) return a.type.localeCompare(b.type)
					return (a.type || '').localeCompare(b.type || '')
				})

				events.value = merged
			}

			watch(() => props.visible, (v) => {
				if (v) {
					addTitle.value = ''
					addType.value = 'water'
					addPerson.value = 'both'
					currentStatus.value = props.status || 'normal'
					updateEvents()
				}
			}, {
				immediate: true
			})
			watch(() => props.events, updateEvents)

			async function changeStatus(sid) {
				currentStatus.value = sid
				const key = dateKey(props.year, props.month, props.day)
				const param = {
					date: key,
					status: sid,
					status_remark: "",
				}
				await putDiaryStatus(param)
				emit('refresh')
			}

			async function doAdd() {
				if (!addType.value) return
				const title = addTitle.value.trim() || types.find(t => t.id === addType.value).name
				await addEvent(props.year, props.month, props.day, addType.value, title, addPerson.value)
				addTitle.value = ''
				emit('refresh')
			}

			async function incEvent(ev) {
				await addEvent(props.year, props.month, props.day, ev.type, ev.title, ev.person || 'both')
				emit('refresh')
			}
			async function decEvent(ev) {
				await decrementEvent(props.year, props.month, props.day, ev.type)
				emit('refresh')
			}
			async function delEvent(id) {
				await removeEvent(id)
				emit('refresh')
			}
			async function clearAll() {
				await clearDateEvents(props.year, props.month, props.day)
				emit('refresh')
			}

			function typeColor(tid) {
				const t = types.find(t => t.id === tid)
				return t ? t.color : '#8E8E93'
			}

			function typeName(tid) {
				const t = types.find(t => t.id === tid)
				return t ? t.name : '自定义'
			}

			function countableType(tid) {
				const t = types.find(t => t.id === tid)
				return t ? t.countable : false
			}

			function personColor(pid) {
				const p = persons.find(p => p.id === pid)
				return p ? p.color : '#9B59B6'
			}

			function personName(pid) {
				const p = persons.find(p => p.id === pid)
				return p ? p.name : '共同'
			}

			function formatTime(t) {
				if (!t) return ''
				// API 返回格式如 "2025-07-13T10:30:00Z" 或 "2025-07-13T10:30:00+08:00"
				const d = new Date(t)
				if (isNaN(d.getTime())) return t.substring(11, 16) || t.substring(0, 10)
				const hh = String(d.getHours()).padStart(2, '0')
				const mm = String(d.getMinutes()).padStart(2, '0')
				return hh + ':' + mm
			}

			return {
				statuses,
				types,
				persons,
				isDark,
				currentStatus,
				events,
				addType,
				addTitle,
				addPerson,
				weekdayLabel,
				addPlaceholder,
				changeStatus,
				doAdd,
				incEvent,
				decEvent,
				delEvent,
				clearAll,
				typeColor,
				typeName,
				countableType,
				personColor,
				personName,
				formatTime
			}
		}
	}
</script>

<style lang="scss" scoped>
	/* ====== 遮罩 ====== */
	.modal-mask {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		background: rgba(0, 0, 0, .4);
		z-index: 999;
		display: flex;
		align-items: flex-end;
	}

	/* ====== 面板 ====== */
	.modal-sheet {
		background: #fff;
		border-radius: 32rpx 32rpx 0 0;
		width: 100%;
		max-height: 75vh;
		display: flex;
		flex-direction: column;
		padding-bottom: 40rpx;
		overflow-y: auto;
		box-shadow: 0 -8rpx 40rpx rgba(0, 0, 0, .06);
	}

	.modal-dark .modal-sheet {
		background: #1c1c1e;
	}

	/* ====== 日期标题 ====== */
	.sheet-head {
		padding: 36rpx 36rpx 20rpx;
	}

	.head-date {
		font-size: 44rpx;
		font-weight: 700;
		color: #1a1a1a;
	}

	.modal-dark .head-date {
		color: #e5e5e7;
	}

	.head-weekday {
		display: block;
		font-size: 26rpx;
		color: #999;
		margin-top: 4rpx;
	}

	.modal-dark .head-weekday {
		color: #8e8e93;
	}

	/* ====== 内容块 ====== */
	.block {
		padding: 24rpx 36rpx;
		border-top: 1rpx solid #f0f0f0;
	}

	.modal-dark .block {
		border-top-color: #38383a;
	}

	.block-title {
		font-size: 26rpx;
		font-weight: 600;
		color: #1a1a1a;
		margin-bottom: 20rpx;
	}

	.modal-dark .block-title {
		color: #e5e5e7;
	}

	.muted {
		font-weight: 400;
		color: #999;
	}

	.modal-dark .muted {
		color: #8e8e93;
	}

	/* ====== 状态选择 ====== */
	.status-row {
		display: flex;
	}

	.status-dot {
		display: flex;
		align-items: center;
		font-size: 24rpx;
		color: #999;
		padding: 8rpx 0;
		margin-right: 40rpx;
	}

	.status-dot.active {
		font-weight: 600;
		color: #1a1a1a;
	}

	.modal-dark .status-dot {
		color: #8e8e93;
	}

	.modal-dark .status-dot.active {
		color: #e5e5e7;
	}

	.dot-circle {
		width: 16rpx;
		height: 16rpx;
		border-radius: 50%;
		border: 2rpx solid #ddd;
		background: transparent;
		margin-right: 10rpx;
	}

	/* ====== 事件列表 ====== */
	.event-list {
		display: flex;
		flex-direction: column;
	}

	.event-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24rpx;
		background: #f8f8f8;
		border-radius: 16rpx;
		margin-bottom: 10rpx;
	}

	.event-item:last-child {
		margin-bottom: 0;
	}

	.modal-dark .event-item {
		background: #2c2c2e;
	}

	.ev-left {
		display: flex;
		align-items: center;
		flex: 1;
		overflow: hidden;
	}

	.ev-info {
		overflow: hidden;
		margin-left: 16rpx;
	}

	.ev-title {
		font-size: 28rpx;
		font-weight: 500;
		color: #1a1a1a;
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.modal-dark .ev-title {
		color: #e5e5e7;
	}

	.ev-meta {
		display: flex;
		align-items: center;
		margin-top: 4rpx;
	}

	.ev-type {
		font-size: 22rpx;
		color: #999;
		margin-right: 8rpx;
	}

	.modal-dark .ev-type {
		color: #8e8e93;
	}

	.ev-person-tag {
		font-size: 20rpx;
		padding: 2rpx 12rpx;
		border-radius: 20rpx;
		font-weight: 500;
	}

	.ev-time {
		font-size: 20rpx;
		color: #bbb;
		display: block;
		margin-top: 4rpx;
	}

	.modal-dark .ev-time {
		color: #636366;
	}

	/* ====== 事件右侧 ====== */
	.ev-right {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.count-ctrl {
		display: flex;
		align-items: center;
		background: #fff;
		border-radius: 20rpx;
		padding: 4rpx 10rpx;
		border: 1rpx solid #eee;
		margin-right: 14rpx;
	}

	.modal-dark .count-ctrl {
		background: #3a3a3c;
		border-color: #48484a;
	}

	.count-btn {
		width: 40rpx;
		height: 40rpx;
		line-height: 40rpx;
		text-align: center;
		font-size: 28rpx;
		font-weight: 500;
		color: #1a1a1a;
	}

	.modal-dark .count-btn {
		color: #e5e5e7;
	}

	.count-num {
		font-size: 28rpx;
		font-weight: 700;
		color: #1a1a1a;
		min-width: 36rpx;
		text-align: center;
		margin: 0 4rpx;
	}

	.modal-dark .count-num {
		color: #e5e5e7;
	}

	.del-btn {
		font-size: 32rpx;
		color: #ccc;
		padding: 4rpx;
		font-weight: 300;
	}

	/* ====== 人物选择 ====== */
	.person-row {
		display: flex;
		margin-bottom: 20rpx;
	}

	.person-chip {
		padding: 10rpx 28rpx;
		border-radius: 24rpx;
		border: 1px solid #ddd;
		font-size: 24rpx;
		margin-right: 16rpx;
	}

	.person-chip.active {
		font-weight: 600;
	}

	/* ====== 类型选择 ====== */
	.type-scroll {
		white-space: nowrap;
		margin-bottom: 20rpx;
	}

	.type-row {
		display: inline-flex;
	}

	.type-chip {
		display: inline-flex;
		flex-direction: column;
		justify-content: center;
		text-align: center;
		align-items: center;
		padding: 12rpx 20rpx;
		border-radius: 24rpx;
		border: 1px solid #eee;
		font-size: 24rpx;
		white-space: nowrap;
		margin-right: 10rpx;
	}

	.type-chip.active {
		background: #f5f5f5;
	}

	.modal-dark .type-chip.active {
		background: #2c2c2e;
	}

	/* ====== 输入行 ====== */
	.add-bar {
		display: flex;
		align-items: center;
	}

	.add-input {
		flex: 1;
		height: 76rpx;
		border: 1px solid #eee;
		border-radius: 40rpx;
		padding: 0 28rpx;
		font-size: 26rpx;
		background: #f8f8f8;
		color: #1a1a1a;
	}

	.modal-dark .add-input {
		background: #2c2c2e;
		border-color: #48484a;
		color: #e5e5e7;
	}

	.add-btn {
		flex-shrink: 0;
		width: 80rpx;
		height: 80rpx;
		border-radius: 50%;
		background: #1a1a1a;
		color: #fff;
		font-size: 40rpx;
		font-weight: 300;
		line-height: 80rpx;
		text-align: center;
		margin-left: 14rpx;
	}

	.add-btn:active {
		opacity: .7;
	}

	.modal-dark .add-btn {
		background: #e5e5e7;
		color: #1c1c1e;
	}

	/* ====== 底部 ====== */
	.sheet-foot {
		display: flex;
		justify-content: space-between;
		padding: 16rpx 36rpx 0;
	}

	.foot-link {
		font-size: 26rpx;
		color: #999;
		padding: 10rpx 0;
		font-weight: 500;
	}

	.modal-dark .foot-link {
		color: #8e8e93;
	}

	.foot-link.danger {
		color: #ff3b30;
	}
</style>
