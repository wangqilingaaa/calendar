<template>
	<view class="modal-mask" :class="{ 'modal-dark': isDark }" v-if="visible" @tap="$emit('close')">
		<view class="modal-sheet" @tap.stop>
			<!-- 日期标题 -->
			<view class="sheet-head">
				<text class="head-date">{{ month + 1 }}月{{ day }}日</text>
				<text class="head-weekday">{{ weekdayLabel }}</text>
			</view>

			<!-- ====== 日期状态 ====== -->
			<view v-if="!editingEvent" class="block">
				<view class="status-row">
					<view v-for="s in statuses" :key="s.id" class="status-dot" :class="{ active: currentStatus === s.id }"
						@tap="changeStatus(s.id)">
						<view class="dot-circle" :style="s.color !== 'transparent'
							? {
								backgroundColor:
									currentStatus === s.id
										? s.color
										: 'transparent',
								borderColor:
									currentStatus === s.id
										? s.color
										: '#ddd',
							}
							: { borderColor: '#ddd' }
							">
						</view>
						<text>{{ s.name }}</text>
					</view>
				</view>
			</view>

			<!-- ====== 事件列表 ====== -->
			<view v-if="!editingEvent" class="block">
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
									<text class="ev-type">{{
										typeName(ev.type)
									}}</text>
									<view class="ev-person-tag" :style="{
										backgroundColor:
											personColor(ev.person) + '18',
										color: personColor(ev.person),
									}">
										{{ personName(ev.person) }}
									</view>
								</view>
								<text v-if="ev.createdAt" class="ev-time">{{
									formatTime(ev.createdAt)
								}}</text>
							</view>
						</view>
						<view class="ev-right">
							<template v-if="countableType(ev.type) && ev.count > 0">
								<view class="count-ctrl">
									<text class="count-btn" @tap.stop="decEvent(ev)">-</text>
									<text class="count-num">{{
										ev.count
									}}</text>
									<text class="count-btn" @tap.stop="incEvent(ev)">+</text>
								</view>
							</template>
							<view class="ev-edit" @tap.stop="startEdit(ev)">
								<app-icon name="edit" :size="32" :color="isDark ? '#8e8e93' : '#999'" />
							</view>
							<text class="del-btn" @tap.stop="delEvent(ev.id)">x</text>
						</view>
					</view>
				</view>
			</view>

			<!-- ====== 添加 / 编辑事件 ====== -->
			<view class="block">
				<view class="block-title">
					<text>{{ editingEvent ? "编辑事件" : "添加" }}</text>
					<text v-if="editingEvent" class="block-title-hint">— {{ editingEvent.title }}</text>
					<text v-if="editingEvent" class="block-title-action" @tap="cancelEdit">取消</text>
				</view>

				<!-- 编辑时可跨天修改日期 -->
				<view v-if="editingEvent" class="edit-date-row">
					<text class="ex-label">日期</text>
					<picker class="edit-date-picker" mode="date" :value="editDate" @change="onEditDateChange">
						<view class="edit-date-box">
							<text class="edit-date-text">{{ editDate }}</text>
							<text class="edit-date-arrow">›</text>
						</view>
					</picker>
				</view>

				<!-- 人物选择 -->
				<view class="person-row">
					<view v-for="p in persons" :key="p.id" class="person-chip" :class="{ active: addPerson === p.id }" :style="addPerson === p.id
						? {
							backgroundColor: p.color,
							borderColor: p.color,
							color: '#fff',
						}
						: {
							color: p.color,
							borderColor: p.color + '60',
						}
						" @tap="addPerson = p.id">
						<text>{{ personDisplayText(p) }}</text>
					</view>
				</view>

				<!-- 类型选择 -->
				<scroll-view scroll-x class="type-scroll" :show-scrollbar="false">
					<view class="type-row">
						<view v-for="t in types" :key="t.id" class="type-chip" :class="{ active: addType === t.id }" :style="addType === t.id ? { borderColor: t.color } : {}
							" @tap="addType = t.id">
							<app-icon :name="t.id" :size="32" :color="addType === t.id ? t.color : '#999'" />
							<text :style="addType === t.id
								? { color: t.color }
								: { color: '#999' }
								">{{ t.name }}</text>
						</view>
					</view>
				</scroll-view>

				<!-- 运动记录：健身房场景，动作联想 + 组次 + 重量 -->
				<view v-if="isExercise" class="exercise-form">
					<view class="ex-field">
						<text class="ex-label">动作</text>
						<view class="ex-input-wrap">
							<input class="ex-input" v-model="exerciseAction" placeholder="输入或选择动作，如 卧推、深蹲"
								placeholder-class="ex-placeholder" confirm-type="done" />
						</view>
						<view v-if="gymSuggestions.length" class="ex-suggest">
							<view v-for="name in gymSuggestions" :key="name" class="ex-suggest-chip"
								:class="{ active: exerciseActionKeyword === name }" @tap="exerciseAction = name">{{ name }}</view>
						</view>
						<text v-else class="ex-suggest-empty">没有匹配动作，将直接使用自定义名称</text>
					</view>

					<view class="ex-metrics">
						<view class="ex-metric">
							<text class="ex-label">组数</text>
							<view class="ex-metric-box">
								<input class="ex-metric-input" type="number" v-model="exerciseSets" :maxlength="2"
									confirm-type="done" />
								<text class="ex-metric-unit">组</text>
							</view>
						</view>
						<view class="ex-metric">
							<text class="ex-label">次数</text>
							<view class="ex-metric-box">
								<input class="ex-metric-input" type="number" v-model="exerciseReps" :maxlength="3"
									confirm-type="done" />
								<text class="ex-metric-unit">次</text>
							</view>
						</view>
						<view class="ex-metric">
							<text class="ex-label">重量</text>
							<view class="ex-metric-box">
								<input class="ex-metric-input" type="digit" v-model="exerciseWeight" placeholder="选填"
									placeholder-class="ex-placeholder" confirm-type="done" />
								<text class="ex-metric-unit">kg</text>
							</view>
						</view>
					</view>

					<view class="ex-field">
						<text class="ex-label">备注</text>
						<view class="ex-input-wrap">
							<input class="ex-input" v-model="addTitle" placeholder="选填，如 第一个动作、状态不错"
								placeholder-class="ex-placeholder" confirm-type="done" @confirm="doAdd" />
						</view>
					</view>

					<view class="ex-submit" @tap="doAdd">
						<app-icon name="exercise" :size="32" color="#fff" />
						<text>{{ editingEvent ? "保存修改" : "添加健身记录" }}</text>
					</view>
				</view>

				<!-- 其他类型：保持单行备注输入 -->
				<view v-else class="add-bar">
					<input class="add-input" v-model="addTitle" :placeholder="addPlaceholder" confirm-type="done"
						@confirm="doAdd" />
					<text v-if="!editingEvent" class="add-btn" @tap="doAdd">+</text>
				</view>
				<view v-if="editingEvent && !isExercise" class="edit-submit" @tap="doAdd">保存修改</view>
			</view>

			<!-- 底部 -->
			<view class="sheet-foot">
				<text v-if="events.length && !editingEvent" class="foot-link danger" @tap="clearAll">清空全部</text>
				<text class="foot-link" @tap="$emit('close')">关闭</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import {
	addEvent,
	updateEvent,
	removeEvent,
	decrementEvent,
	clearDateEvents,
	EVENT_TYPES,
	DATE_STATUSES,
	PERSONS,
	dateKey,
} from "@/store/calendar.js";
import {
	findPersonById,
	normalizePersonId,
	toPersonPayload,
} from "@/store/persons.js";
import { getTheme } from "@/store/theme.js";
import { getUser } from "@/store/auth.js";
import AppIcon from "@/components/app-icon/index.vue";
import gymActionData from "@/data/gym-actions.json";
import { putDiaryStatus } from "../../api/diary";

const props = defineProps({
	year: {
		type: Number,
		required: true,
	},
	month: {
		type: Number,
		required: true,
	},
	day: {
		type: Number,
		required: true,
	},
	status: {
		type: String,
		default: "normal",
	},
	events: {
		type: Array,
		default: () => [],
	},
	visible: {
		type: Boolean,
		default: false,
	},
	// 动态人物列表（来自当前用户 + 绑定用户的 identity_tag）
	persons: {
		type: Array,
		default: () => PERSONS,
	},
});

const emit = defineEmits(["close", "refresh"]);

const statuses = DATE_STATUSES;
const types = EVENT_TYPES;

const isDark = ref(getTheme() === "dark");
const currentStatus = ref("normal");
const events = ref([]);
const editingEvent = ref(null);
const editDate = ref("");
const saving = ref(false);
const addType = ref("water");
const addTitle = ref("");
// 当前角色身份默认选中数据库 user.id；
// identity_tag 仅用于展示，不参与前端主键流转。
const me = getUser();
const myPersonId = (me && me.id) || "both";
const addPerson = ref(myPersonId);

// 健身房动作库维护在 data/gym-actions.json，输入时用于联想，也允许自定义名称
const GYM_ACTIONS = gymActionData.actions || [];
const POPULAR_GYM_ACTIONS = gymActionData.popular || [];
const exerciseAction = ref("");
const exerciseSets = ref("4");
const exerciseReps = ref("10");
const exerciseWeight = ref("");

const isExercise = computed(() => addType.value === "exercise");

const exerciseActionKeyword = computed(() => exerciseAction.value.trim());

const gymSuggestions = computed(() => {
	const keyword = exerciseActionKeyword.value;
	if (!keyword) return POPULAR_GYM_ACTIONS;
	return GYM_ACTIONS.filter((name) => name.includes(keyword)).slice(0, 6);
});

const weekdayLabel = computed(() => {
	const date = new Date(props.year, props.month, props.day);
	return "周" + ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
});

const addPlaceholder = computed(() => "备注（选填）");

// 这里保留一层 computed，是为了让父组件在加载到最新人物列表后，
// 弹窗中的人物选项能无缝跟随更新。
const persons = computed(() => props.persons);

// 从 props.events 合并展示（可计数类型合并，不发起 API 请求）
function updateEvents() {
	isDark.value = getTheme() === "dark";
	const sourceEvents = props.events || [];
	const merged = [];
	const typeMap = {};

	sourceEvents.forEach((event) => {
		const type = types.find((item) => item.id === event.type);
		const personId = normalizePersonId(
			event.person || "both",
			persons.value,
		);
		if (type && type.countable) {
			const key = event.type + "|" + personId + "|" + event.title;
			if (typeMap[key]) {
				typeMap[key].count++;
			} else {
				typeMap[key] = {
					...event,
					person: personId,
					count: 1,
				};
			}
		} else {
			merged.push({
				...event,
				person: personId,
				count: 0,
			});
		}
	});

	Object.values(typeMap).forEach((value) => merged.push(value));
	// 固定排序，避免父组件刷新后同类事件在列表中跳动。
	merged.sort((a, b) => {
		if (a.type !== b.type) return a.type.localeCompare(b.type);
		return (a.type || "").localeCompare(b.type || "");
	});

	events.value = merged;
}

watch(
	() => props.visible,
	(visible) => {
		if (visible) {
			editingEvent.value = null;
			resetAddForm();
			currentStatus.value = props.status || "normal";
			updateEvents();
		}
	},
	{
		immediate: true,
	},
);

watch(() => props.events, updateEvents);

async function changeStatus(statusId) {
	currentStatus.value = statusId;
	const key = dateKey(props.year, props.month, props.day);
	const param = {
		date: key,
		status: statusId,
		status_remark: "",
	};
	await putDiaryStatus(param);
	emit("refresh");
}

function resetAddForm() {
	addTitle.value = "";
	addType.value = "water";
	addPerson.value = myPersonId;
	editDate.value = "";
	resetExerciseForm();
}

function resetExerciseForm() {
	exerciseAction.value = "";
	exerciseSets.value = "4";
	exerciseReps.value = "10";
	exerciseWeight.value = "";
}

function cancelEdit() {
	if (saving.value) return;
	editingEvent.value = null;
	resetAddForm();
}

// 编辑回填：普通事件回填备注，运动事件尝试解析「动作 · N组×M次 · Xkg · 备注」
function startEdit(event) {
	editingEvent.value = event;
	editDate.value = dateKey(props.year, props.month, props.day);
	addPerson.value = normalizePersonId(event.person || "both", persons.value);
	addType.value = event.type;
	addTitle.value = "";
	resetExerciseForm();

	const title = event.title || "";
	const type = types.find((item) => item.id === event.type);

	if (event.type === "exercise") {
		const parsed = parseExerciseTitle(title);
		if (parsed) {
			exerciseAction.value = parsed.action;
			exerciseSets.value = parsed.sets;
			exerciseReps.value = parsed.reps;
			exerciseWeight.value = parsed.weight;
			addTitle.value = parsed.note;
		}
		return;
	}

	// 标题等于类型名时说明原记录没有备注，输入框保持为空
	if (title && (!type || title !== type.name)) {
		addTitle.value = title;
	}
}

function onEditDateChange(event) {
	editDate.value = event.detail.value;
}

// 解析运动备注；历史自由文本整体作为动作名回填
function parseExerciseTitle(title) {
	const text = String(title || "").trim();
	if (!text || text === typeName("exercise")) return null;

	const parts = text.split(" · ");
	const parsed = {
		action: parts[0] || "",
		sets: "4",
		reps: "10",
		weight: "",
		note: "",
	};
	let index = 1;

	const setsReps = (parts[index] || "")
		.trim()
		.match(/^(\d+)组\s*[×xX]\s*(\d+)次$/);
	if (setsReps) {
		parsed.sets = setsReps[1];
		parsed.reps = setsReps[2];
		index += 1;
	}

	const weight = (parts[index] || "")
		.trim()
		.match(/^([\d.]+)\s*kg$/i);
	if (weight) {
		parsed.weight = weight[1];
		index += 1;
	}

	parsed.note = parts.slice(index).join(" · ");
	return parsed;
}

// 把结构化输入拼成一条可读备注，后端仍只存 event_remark 一个字段
// 例如：卧推 · 4组×10次 · 60kg · 状态不错
function buildExerciseTitle(sets, reps, weight) {
	const parts = [exerciseActionKeyword.value, sets + "组×" + reps + "次"];
	if (Number.isFinite(weight) && weight > 0) {
		parts.push(Number(weight.toFixed(2)) + "kg");
	}
	const note = addTitle.value.trim();
	if (note) parts.push(note);
	return parts.join(" · ");
}

async function doAdd() {
	if (!addType.value || saving.value) return;
	const type = types.find((item) => item.id === addType.value);
	let title = "";

	if (isExercise.value) {
		if (!exerciseActionKeyword.value) {
			uni.showToast({ title: "请输入动作名称", icon: "none" });
			return;
		}
		const sets = parseInt(exerciseSets.value, 10);
		if (!sets || sets <= 0) {
			uni.showToast({ title: "请填写组数", icon: "none" });
			return;
		}
		const reps = parseInt(exerciseReps.value, 10);
		if (!reps || reps <= 0) {
			uni.showToast({ title: "请填写次数", icon: "none" });
			return;
		}
		const weightText = exerciseWeight.value.trim();
		const weight = parseFloat(weightText);
		if (weightText && (!Number.isFinite(weight) || weight <= 0)) {
			uni.showToast({ title: "重量填写有误", icon: "none" });
			return;
		}
		title = buildExerciseTitle(sets, reps, weight);
	} else {
		title = addTitle.value.trim() || (type ? type.name : "");
	}

	const personId = normalizePersonId(addPerson.value, persons.value);
	const personPayload = toPersonPayload(personId, persons.value);

	if (editingEvent.value) {
		const original = editingEvent.value;
		// 没有任何修改时直接退出编辑，避免无谓请求
		if (
			original.type === addType.value &&
			original.person === personId &&
			original.title === title &&
			editDate.value === dateKey(props.year, props.month, props.day)
		) {
			cancelEdit();
			return;
		}

		const movedDate =
			editDate.value !== dateKey(props.year, props.month, props.day);

		saving.value = true;
		try {
			await updateEvent(
				original.id,
				editDate.value,
				addType.value,
				title,
				personPayload,
			);
		} catch (_) {
			// 请求层已提示错误，保留编辑态方便重试
			return;
		} finally {
			saving.value = false;
		}

		editingEvent.value = null;
		resetAddForm();
		if (movedDate) {
			uni.showToast({ title: "已移动到所选日期", icon: "none" });
		}
		emit("refresh");
		return;
	}

	saving.value = true;
	try {
		await addEvent(
			props.year,
			props.month,
			props.day,
			addType.value,
			title,
			personPayload,
		);
	} catch (_) {
		return;
	} finally {
		saving.value = false;
	}
	addTitle.value = "";
	// 保留组次便于连续记录下一个动作，动作和重量需要重新填写
	if (isExercise.value) {
		exerciseAction.value = "";
		exerciseWeight.value = "";
	}
	emit("refresh");
}

async function incEvent(event) {
	const personId = normalizePersonId(event.person || "both", persons.value);
	const personPayload = toPersonPayload(personId, persons.value);
	await addEvent(
		props.year,
		props.month,
		props.day,
		event.type,
		event.title,
		personPayload,
	);
	emit("refresh");
}

async function decEvent(event) {
	// 同一天可能有多种运动记录，需要带上备注和人物才能精确减少对应那一行
	await decrementEvent(
		props.year,
		props.month,
		props.day,
		event.type,
		event.title,
		event.person,
		persons.value,
	);
	emit("refresh");
}

async function delEvent(id) {
	await removeEvent(id);
	emit("refresh");
}

async function clearAll() {
	await clearDateEvents(props.year, props.month, props.day);
	emit("refresh");
}

function typeColor(typeId) {
	const type = types.find((item) => item.id === typeId);
	return type ? type.color : "#8E8E93";
}

function typeName(typeId) {
	const type = types.find((item) => item.id === typeId);
	return type ? type.name : "自定义";
}

function countableType(typeId) {
	const type = types.find((item) => item.id === typeId);
	return type ? type.countable : false;
}

function findPersonConfig(personKey) {
	const personId = normalizePersonId(personKey, persons.value);
	return findPersonById(personId, persons.value);
}

// 人物展示统一优先读取 identity_tag。
// 这样既能满足“人物选择展示身份标签”的需求，也能兼容旧数据里只有 name 的情况。
function personDisplayText(person) {
	if (!person) return "共同";
	return person.identity_tag || person.name || "共同";
}

function personColor(personN) {
	const person =
		findPersonConfig(personN);
	return person ? person.color : "#9B59B6";
}

function personName(personN) {
	const person =
		findPersonConfig(personN);
	return personDisplayText(person);
}

function formatTime(time) {
	if (!time) return "";
	// API 返回格式如 "2025-07-13T10:30:00Z" 或 "2025-07-13T10:30:00+08:00"
	const date = new Date(time);
	if (isNaN(date.getTime()))
		return time.substring(11, 16) || time.substring(0, 10);
	const hh = String(date.getHours()).padStart(2, "0");
	const mm = String(date.getMinutes()).padStart(2, "0");
	return hh + ":" + mm;
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
	background: rgba(0, 0, 0, 0.4);
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
	box-shadow: 0 -8rpx 40rpx rgba(0, 0, 0, 0.06);
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
	display: flex;
	align-items: center;
	font-size: 26rpx;
	font-weight: 600;
	color: #1a1a1a;
	margin-bottom: 20rpx;
}

.modal-dark .block-title {
	color: #e5e5e7;
}

.block-title-hint {
	flex: 1;
	min-width: 0;
	margin-left: 10rpx;
	font-size: 22rpx;
	font-weight: 400;
	color: #999;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.block-title-action {
	flex-shrink: 0;
	margin-left: 16rpx;
	font-size: 24rpx;
	font-weight: 500;
	color: #999;
}

.modal-dark .block-title-hint,
.modal-dark .block-title-action {
	color: #8e8e93;
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

.ev-edit {
	padding: 4rpx 10rpx;
	margin-right: 4rpx;
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

/* ====== 编辑日期 ====== */
.edit-date-row {
	margin-bottom: 20rpx;
}

.edit-date-picker {
	display: block;
}

.edit-date-box {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	height: 72rpx;
	padding: 0 24rpx;
	box-sizing: border-box;
	background: #f8f8f8;
	border-radius: 16rpx;
}

.modal-dark .edit-date-box {
	background: #2c2c2e;
}

.edit-date-text {
	font-size: 26rpx;
	color: #1a1a1a;
}

.modal-dark .edit-date-text {
	color: #e5e5e7;
}

.edit-date-arrow {
	font-size: 36rpx;
	font-weight: 300;
	color: #999;
}

.modal-dark .edit-date-arrow {
	color: #8e8e93;
}

/* ====== 运动表单 ====== */
.exercise-form {
	background: #f8f8f8;
	border-radius: 20rpx;
	padding: 24rpx;
}

.modal-dark .exercise-form {
	background: #2c2c2e;
}

.ex-field {
	margin-bottom: 22rpx;
}

.ex-label {
	display: block;
	font-size: 22rpx;
	color: #999;
	margin-bottom: 12rpx;
}

.modal-dark .ex-label {
	color: #8e8e93;
}

.ex-suggest {
	display: flex;
	flex-wrap: wrap;
	margin-top: 12rpx;
	margin-bottom: -12rpx;
}

.ex-suggest-chip {
	padding: 8rpx 22rpx;
	border-radius: 20rpx;
	border: 1rpx solid #e5e5e5;
	background: #fff;
	color: #666;
	font-size: 24rpx;
	margin: 0 12rpx 12rpx 0;
}

.modal-dark .ex-suggest-chip {
	background: #3a3a3c;
	border-color: #48484a;
	color: #a1a1a6;
}

.ex-suggest-chip.active {
	background: rgba(76, 175, 80, 0.12);
	border-color: $cal-event-exercise;
	color: #388e3c;
	font-weight: 600;
}

.modal-dark .ex-suggest-chip.active {
	background: rgba(76, 175, 80, 0.22);
	border-color: $cal-event-exercise;
	color: #81c784;
}

.ex-suggest-empty {
	display: block;
	margin-top: 12rpx;
	font-size: 22rpx;
	color: #999;
}

.modal-dark .ex-suggest-empty {
	color: #8e8e93;
}

.ex-metrics {
	display: flex;
	margin-bottom: 22rpx;
}

.ex-metric {
	flex: 1;
	min-width: 0;
	margin-right: 16rpx;
}

.ex-metric:last-child {
	margin-right: 0;
}

.ex-metric-box {
	display: flex;
	align-items: center;
	height: 72rpx;
	padding: 0 20rpx;
	background: #fff;
	border: 1rpx solid #e5e5e5;
	border-radius: 16rpx;
}

.modal-dark .ex-metric-box {
	background: #3a3a3c;
	border-color: #48484a;
}

.ex-metric-input {
	flex: 1;
	min-width: 0;
	height: 72rpx;
	text-align: center;
	font-size: 28rpx;
	font-weight: 600;
	color: #1a1a1a;
}

.modal-dark .ex-metric-input {
	color: #e5e5e7;
}

.ex-metric-unit {
	font-size: 22rpx;
	color: #999;
	margin-left: 4rpx;
}

.modal-dark .ex-metric-unit {
	color: #8e8e93;
}

.ex-input-wrap {
	display: flex;
	align-items: center;
	height: 72rpx;
	background: #fff;
	border: 1rpx solid #e5e5e5;
	border-radius: 16rpx;
	padding: 0 24rpx;
}

.modal-dark .ex-input-wrap {
	background: #3a3a3c;
	border-color: #48484a;
}

.ex-input {
	flex: 1;
	height: 72rpx;
	font-size: 26rpx;
	color: #1a1a1a;
}

.modal-dark .ex-input {
	color: #e5e5e7;
}

.ex-placeholder {
	color: #bbb;
	font-size: 26rpx;
}

.modal-dark .ex-placeholder {
	color: #636366;
}

.ex-submit,
.edit-submit {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 80rpx;
	margin-top: 28rpx;
	border-radius: 40rpx;
	background: linear-gradient(135deg, $cal-event-exercise, #66bb6a);
	color: #fff;
	font-size: 28rpx;
	font-weight: 600;
	box-shadow: 0 10rpx 20rpx rgba(76, 175, 80, 0.2);
}

.edit-submit {
	margin-top: 20rpx;
	background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
	box-shadow: 0 10rpx 20rpx var(--theme-ring);
}

.ex-submit:active,
.edit-submit:active {
	opacity: 0.85;
}

.ex-submit text {
	margin-left: 10rpx;
}

/* ====== 输入行 ====== */
.add-bar {
	display: flex;
	align-items: center;
}

.add-input {
	flex: 1;
	height: 76rpx;
	border: 1px solid var(--theme-ring);
	border-radius: 40rpx;
	padding: 0 28rpx;
	font-size: 26rpx;
	background: #f8f8f8;
	color: #1a1a1a;
}

.modal-dark .add-input {
	background: #2c2c2e;
	border-color: var(--theme-soft-bg-dark);
	color: #e5e5e7;
}

.add-btn {
	flex-shrink: 0;
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
	color: #fff;
	font-size: 40rpx;
	font-weight: 300;
	line-height: 80rpx;
	text-align: center;
	margin-left: 14rpx;
	box-shadow: 0 10rpx 20rpx var(--theme-ring);
}

.add-btn:active {
	opacity: 0.7;
}

.modal-dark .add-btn {
	background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
	color: #fff;
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
