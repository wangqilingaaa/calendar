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
					<view v-for="item in eventViews" :key="item.ev.source + '-' + item.ev.id" class="event-item">
						<view class="ev-left">
							<app-icon :name="item.ev.type" :size="36" :color="typeColor(item.ev.type)" />
							<view class="ev-info">
								<text class="ev-title">{{ item.title }}</text>
								<text v-if="item.metrics" class="ev-exercise-tag">{{ item.metrics }}</text>
								<text v-if="item.note" class="ev-note">{{ item.note }}</text>
								<view class="ev-meta">
									<text class="ev-type">{{
										typeName(item.ev.type)
									}}</text>
									<view class="ev-person-tag" :style="{
										backgroundColor:
											personColor(item.ev.person) + '18',
										color: personColor(item.ev.person),
									}">
										{{ personName(item.ev.person) }}
									</view>
								</view>
								<text v-if="item.ev.createdAt" class="ev-time">{{
									formatTime(item.ev.createdAt)
								}}</text>
							</view>
						</view>
						<view class="ev-right">
							<template v-if="countableType(item.ev.type) && item.ev.count > 0">
								<view class="count-ctrl">
									<text class="count-btn" @tap.stop="decEvent(item.ev)">-</text>
									<text class="count-num">{{
										item.ev.count
									}}</text>
									<text class="count-btn" @tap.stop="incEvent(item.ev)">+</text>
								</view>
							</template>
							<view class="ev-edit" @tap.stop="startEdit(item.ev)">
								<app-icon name="edit" :size="32" :color="isDark ? '#8e8e93' : '#999'" />
							</view>
							<text class="del-btn" @tap.stop="delEvent(item.ev)">x</text>
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
					<text class="edit-date-label">日期</text>
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

				<!-- 类型选择（结构化健身记录编辑时类型固定为运动，不允许切换） -->
				<scroll-view v-if="!isGymEditing" scroll-x class="type-scroll" :show-scrollbar="false">
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

				<!-- 类型专属录入表单（如运动）；未注册的类型走默认单行输入 -->
				<component v-if="activeTypeForm" :is="activeTypeForm" ref="typeFormRef" :key="typeFormKey"
					:initial-title="typeFormDraft" :initial="typeFormInitial" :editing="Boolean(editingEvent)" :dark="isDark"
					@submit="handleTypeFormSubmit" />
				<template v-else>
					<view class="add-bar">
						<input class="add-input" v-model="addTitle" :placeholder="addPlaceholder" confirm-type="done"
							@confirm="doAdd" />
						<text v-if="!editingEvent" class="add-btn" @tap="doAdd">+</text>
					</view>
					<view v-if="editingEvent" class="edit-submit" @tap="doAdd">保存修改</view>
				</template>
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
import ExerciseForm from "@/components/exercise-form/index.vue";
import {
	createGymRecord,
	updateGymRecord,
	deleteGymRecord,
} from "@/api/gym-records.js";
import { parseExerciseTitle } from "@/utils/exercise.js";
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

// 事件类型 → 专属录入表单组件。
// 新增模块表单时只需在此注册（组件内自行校验并 emit submit），弹窗模板无需改动。
const TYPE_FORM_COMPONENTS = {
	exercise: ExerciseForm,
};

const activeTypeForm = computed(() => TYPE_FORM_COMPONENTS[addType.value] || null);

// 结构化健身记录的类型固定为运动，编辑时隐藏类型切换，避免改走日记接口
const isGymEditing = computed(
	() => Boolean(editingEvent.value) && editingEvent.value.source === "gym",
);

// 专属表单的编辑回填数据；编辑对象或类型变化时通过 key 重建表单
const typeFormDraft = ref("");
const typeFormInitial = ref(null);
const typeFormRef = ref(null);
const typeFormKey = computed(() =>
	editingEvent.value
		? `${addType.value}:${editingEvent.value.id}`
		: `${addType.value}:new`,
);

const weekdayLabel = computed(() => {
	const date = new Date(props.year, props.month, props.day);
	return "周" + ["日", "一", "二", "三", "四", "五", "六"][date.getDay()];
});

// 运动记录展示：结构化健身记录直接读取字段，旧版运动日记从备注文本解析
const eventViews = computed(() =>
	events.value.map((ev) => {
		if (ev.source === "gym") {
			const metrics = [
				`${ev.sets}组×${ev.reps}次`,
				Number(ev.weight) > 0 ? `${ev.weight}kg` : "",
			]
				.filter(Boolean)
				.join(" · ");
			return {
				ev,
				title: ev.action || typeName(ev.type),
				metrics,
				note: ev.note || "",
			};
		}

		const parsed =
			ev.type === "exercise" ? parseExerciseTitle(ev.title) : null;
		const info = parsed && (parsed.hasMetrics || parsed.weight) ? parsed : null;
		const metrics = info
			? [
					info.hasMetrics ? `${info.sets}组×${info.reps}次` : "",
					info.weight ? `${info.weight}kg` : "",
				]
					.filter(Boolean)
					.join(" · ")
			: "";
		return {
			ev,
			title: info ? info.action || typeName(ev.type) : ev.title,
			metrics,
			note: info ? info.note : "",
		};
	}),
);

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
		// 结构化健身记录每条独立展示，不参与同类合并与加减计数
		if (event.source === "gym") {
			merged.push({
				...event,
				person: personId,
				count: 0,
			});
			return;
		}
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
	typeFormDraft.value = "";
	typeFormInitial.value = null;
}

function cancelEdit() {
	if (saving.value) return;
	editingEvent.value = null;
	resetAddForm();
}

// 编辑回填：结构化健身记录直接回填字段；旧版运动日记解析备注文本
function startEdit(event) {
	editingEvent.value = event;
	editDate.value = dateKey(props.year, props.month, props.day);
	addPerson.value = normalizePersonId(event.person || "both", persons.value);
	addType.value = event.type;
	addTitle.value = "";
	typeFormDraft.value = "";
	typeFormInitial.value = null;

	const title = event.title || "";
	const type = types.find((item) => item.id === event.type);

	if (TYPE_FORM_COMPONENTS[event.type]) {
		if (event.source === "gym") {
			typeFormInitial.value = {
				action: event.action || "",
				sets: event.sets,
				reps: event.reps,
				weight: event.weight,
				note: event.note || "",
			};
		} else {
			typeFormDraft.value = title;
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

async function doAdd() {
	if (!addType.value || saving.value) return;
	const type = types.find((item) => item.id === addType.value);
	const title = addTitle.value.trim() || (type ? type.name : "");
	if (await saveEvent(title)) addTitle.value = "";
}

// 专属表单提交：校验与字段整理由表单组件完成，弹窗负责按记录来源分流落库
async function handleTypeFormSubmit(payload) {
	if (saving.value) return;
	const wasEditing = Boolean(editingEvent.value);
	const isGymEvent =
		wasEditing && editingEvent.value.source === "gym";

	if (!wasEditing || isGymEvent) {
		// 新增运动记录与结构化记录编辑统一走健身记录接口
		if (!(await saveGymRecord(payload, isGymEvent))) return;
	} else {
		// 旧版运动日记事件沿用文本备注回写日记
		if (!(await saveEvent(payload.title))) return;
	}

	// 新增后保留组次，便于连续记录下一个动作
	const formRef = typeFormRef.value;
	if (!wasEditing && formRef && typeof formRef.resetAfterAdd === "function") {
		formRef.resetAfterAdd();
	}
}

// 健身记录的新增 / 编辑入口；返回 false 表示保存失败或无需提交
async function saveGymRecord(payload, isEditing) {
	const personId = normalizePersonId(addPerson.value, persons.value);
	const personPayload = toPersonPayload(personId, persons.value);
	const todayKey = dateKey(props.year, props.month, props.day);
	const recordDate = editDate.value || todayKey;
	const weightValue = Number(payload.weight);
	const body = {
		date: recordDate,
		person: personPayload,
		action: payload.action,
		sets: Number(payload.sets),
		reps: Number(payload.reps),
		weight:
			Number.isFinite(weightValue) && weightValue > 0 ? weightValue : 0,
		note: payload.note || "",
	};

	if (isEditing) {
		const original = editingEvent.value;
		// 没有任何修改时直接退出编辑，避免无谓请求
		if (
			original.action === body.action &&
			original.person === personId &&
			Number(original.sets) === body.sets &&
			Number(original.reps) === body.reps &&
			Number(original.weight || 0) === body.weight &&
			(original.note || "") === body.note &&
			recordDate === todayKey
		) {
			cancelEdit();
			return false;
		}

		saving.value = true;
		try {
			await updateGymRecord(original.id, body);
		} catch (_) {
			// 请求层已提示错误，保留编辑态方便重试
			return false;
		} finally {
			saving.value = false;
		}

		const movedDate = recordDate !== todayKey;
		editingEvent.value = null;
		resetAddForm();
		if (movedDate) {
			uni.showToast({ title: "已移动到所选日期", icon: "none" });
		}
		emit("refresh");
		return true;
	}

	saving.value = true;
	try {
		await createGymRecord(body);
	} catch (_) {
		return false;
	} finally {
		saving.value = false;
	}
	emit("refresh");
	return true;
}

// 新增 / 编辑共用的保存入口；返回 false 表示保存失败或无需提交
async function saveEvent(title) {
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
			return false;
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
			return false;
		} finally {
			saving.value = false;
		}

		editingEvent.value = null;
		resetAddForm();
		if (movedDate) {
			uni.showToast({ title: "已移动到所选日期", icon: "none" });
		}
		emit("refresh");
		return true;
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
		return false;
	} finally {
		saving.value = false;
	}
	emit("refresh");
	return true;
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
	if (event.source === "gym") {
		await deleteGymRecord(event.id);
		emit("refresh");
		return;
	}
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

// 删除类操作统一弹窗二次确认，防止误触
function confirmDelete(title, content, confirmText = "删除") {
	return new Promise((resolve) => {
		uni.showModal({
			title,
			content,
			confirmText,
			confirmColor: "#dd524d",
			success: (res) => resolve(res.confirm),
			fail: () => resolve(false),
		});
	});
}

async function delEvent(event) {
	const confirmed = await confirmDelete(
		"删除事件",
		`确定删除「${event.title || "该事件"}」吗？此操作不可撤销。`,
	);
	if (!confirmed) return;
	if (event.source === "gym") {
		await deleteGymRecord(event.id);
	} else {
		await removeEvent(event.id);
	}
	emit("refresh");
}

async function clearAll() {
	const confirmed = await confirmDelete(
		"清空全部事件",
		`确定清空当天全部 ${events.value.length} 条事件吗？此操作不可撤销。`,
		"清空",
	);
	if (!confirmed) return;
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

.ev-exercise-tag {
	display: inline-block;
	margin-top: 6rpx;
	padding: 2rpx 12rpx;
	border-radius: 8rpx;
	font-size: 20rpx;
	font-weight: 600;
	color: #388e3c;
	background: rgba(76, 175, 80, 0.12);
}

.modal-dark .ev-exercise-tag {
	color: #81c784;
	background: rgba(76, 175, 80, 0.22);
}

.ev-note {
	display: block;
	margin-top: 4rpx;
	font-size: 22rpx;
	color: #666;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.modal-dark .ev-note {
	color: #a1a1a6;
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

.edit-date-label {
	display: block;
	font-size: 22rpx;
	color: #999;
	margin-bottom: 12rpx;
}

.modal-dark .edit-date-label {
	color: #8e8e93;
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

/* ====== 编辑保存按钮 ====== */
.edit-submit {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 80rpx;
	margin-top: 20rpx;
	border-radius: 40rpx;
	background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
	color: #fff;
	font-size: 28rpx;
	font-weight: 600;
	box-shadow: 0 10rpx 20rpx var(--theme-ring);
}

.edit-submit:active {
	opacity: 0.85;
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
