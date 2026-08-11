<template>
	<view class="calendar-page" :class="[pageThemeClass, { 'theme-dark': isDark }]">
		<!-- ====== 顶部栏 ====== -->
		<view class="top-bar" :style="navBarStyle">
			<view class="top-left">
				<text class="top-year">{{ currentYear }}</text>
				<view class="top-theme" @tap="toggleTheme">
					<app-icon :name="isDark ? 'moon' : 'sun'" :size="36" :color="isDark ? '#f1c40f' : '#f39c12'" />
				</view>
			</view>
			<view class="top-right">
				<view class="top-btn" @tap="goToMeal">
					<app-icon name="eat" :size="36" color="#999" />
				</view>
				<view class="top-btn" @tap="goToStats">
					<app-icon name="statistics" :size="36" color="#999" />
				</view>
				<view class="top-btn" @tap="goToUser">
					<app-icon name="both" :size="36" color="#999" />
				</view>
			</view>
		</view>

		<!-- ====== 月份导航 ====== -->
		<view class="month-nav">
			<text class="nav-arrow" @tap="prevMonth">‹</text>
			<text class="nav-title">{{ currentMonth + 1 }}月</text>
			<text class="nav-arrow" @tap="nextMonth">›</text>
		</view>

		<!-- ====== 星期标题栏 ====== -->
		<view class="weekday-row">
			<text v-for="wd in weekdays" :key="wd" class="weekday-cell"
				:class="{ 'weekday-weekend': wd === '六' || wd === '日' }">{{ wd }}</text>
		</view>

		<!-- ====== 日期网格 ====== -->
		<view class="calendar-grid">
			<view v-for="(cell, idx) in gridCells" :key="idx" class="date-cell" :class="{
				'date-cell--other': !cell.isCurrentMonth,
				'date-cell--today': cell.isToday,
			}" @tap="selectDate(cell)">
				<!-- 日期数字 -->
				<text class="date-num" :class="{ 'date-num--today': cell.isToday }">{{ cell.day }}</text>

				<!-- 人物色点 -->
				<view v-if="cell.personDots.length" class="person-dots">
					<view v-for="(d, di) in cell.personDots" :key="di" class="person-dot" :style="{ backgroundColor: d.color }">
					</view>
				</view>

				<!-- 状态标记 -->
				<view v-if="cell.status !== 'normal'" class="status-mark" :style="{ backgroundColor: cell.statusColor }"></view>
				<!-- 计数角标 -->
				<text v-if="cell.countTotal > 0" class="count-badge">{{
					cell.countTotal
				}}</text>
			</view>
		</view>

		<!-- ====== 今日按钮 ====== -->
		<view v-if="!isCurrentMonth" class="today-fab" @tap="goToday">
			<text>今天</text>
		</view>

		<!-- ====== AI 语音按钮 ====== -->
		<view class="ai-fab" :class="{ 'ai-fab--recording': recording }" @tap="handleAiTap" @longpress="handleAiLongPress"
			@touchend="handleAiTouchEnd" @touchcancel="handleAiTouchEnd">
			<app-icon name="ai" :size="40" :color="recording ? '#ff3b30' : '#fff'" />
		</view>

		<!-- ====== 录音中浮层 ====== -->
		<view v-if="recording" class="record-overlay">
			<view class="record-bubble">
				<view class="record-pulse">
					<view class="record-ring record-ring--1"></view>
					<view class="record-ring record-ring--2"></view>
					<app-icon name="mic" :size="72" color="#fff" />
				</view>
				<text class="record-text">{{ recordTip }}</text>
			</view>
		</view>

		<!-- ====== AI 文字输入弹窗 ====== -->
		<ai-input-modal :visible="aiModalVisible" :month-data="monthDataRef" @close="closeAiModal"
			@confirm="handleAiConfirm" />

		<!-- ====== 日期详情弹窗 ====== -->
		<date-detail-modal v-if="selectedDate" :year="selectedDate.year" :month="selectedDate.month" :day="selectedDate.day"
			:events="selectedEvents" :visible="modalVisible" :status="selectedDate.status" :persons="persons"
			@close="closeModal" @refresh="refreshCalendar" />
	</view>
</template>

<script setup>
import { ref, computed, watch, provide, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import {
	getMonthData,
	DATE_STATUSES,
	PERSONS,
	EVENT_TYPES,
} from "@/store/calendar.js";
import {
	loadPersons,
	findPersonById,
	normalizePersonId,
	toPersonPayload,
} from "@/store/persons.js";
import { getTheme, setTheme } from "@/store/theme.js";
import { createDiary } from "@/api/diary.js";
import { getSpeechRecognitionManager, parseDiaryByText } from "@/api/ai.js";
import { getUser } from "@/store/auth.js";
import { getCurrentProfileThemeClass } from "@/store/profile-theme.js";
import AppIcon from "@/components/app-icon/index.vue";
import DateDetailModal from "@/components/date-detail-modal/index.vue";
import AiInputModal from "@/components/ai-input-modal/index.vue";

const now = new Date();
const currentYear = ref(now.getFullYear());
const currentMonth = ref(now.getMonth());
const weekdays = ["一", "二", "三", "四", "五", "六", "日"];

/* ---- 主题 ---- */
const isDark = ref(getTheme() === "dark");
const pageThemeClass = ref(getCurrentProfileThemeClass());
provide("isDark", isDark);

function toggleTheme() {
	isDark.value = !isDark.value;
	setTheme(isDark.value ? "dark" : "light");
}

// 首页是主入口，从“我的”页面修改性别返回时需要同步刷新主题类和明暗模式。
onShow(() => {
	isDark.value = getTheme() === "dark";
	pageThemeClass.value = getCurrentProfileThemeClass();
});

/* ---- 动态人物列表（当前用户 + 绑定用户的 identity_tag） ---- */
const persons = ref(PERSONS); // 兜底：加载前用硬编码列表
onMounted(async () => {
	persons.value = await loadPersons();
});

// 当前登录用户的身份标签仅用于 AI 语义理解；
// 前端内部的人物主键仍统一使用数据库 id。
const me = getUser();
const myTag = (me && (me.identity_tag || me.username)) || "我";
const myPersonId = (me && me.id) || "both";

/* ---- AI 语音录入 ---- */
const recording = ref(false);
const recordTip = ref("长按说话");
const recognitionManager = ref(null);
const recordStartTime = ref(0);
const longPressTriggered = ref(false);
const aiModalVisible = ref(false);

onMounted(() => {
	// #ifdef MP-WEIXIN
	recognitionManager.value = getSpeechRecognitionManager();
	if (recognitionManager.value) {
		recognitionManager.value.onStop((res) => {
			if (!recording.value) return;
			recording.value = false;
			const duration = Date.now() - recordStartTime.value;
			if (duration < 500 || !res.result) {
				uni.showToast({ title: "说话时间太短", icon: "none" });
				return;
			}
			processAiText(res.result.trim());
		});
		recognitionManager.value.onError((err) => {
			recording.value = false;
			uni.showToast({
				title: "语音识别失败 " + (err.msg || ""),
				icon: "none",
				duration: 3000,
			});
		});
	}
	// #endif
});

async function startAiRecord() {
	let supported = false;

	// #ifdef MP-WEIXIN
	supported = true;
	try {
		await uni.authorize({ scope: "scope.record" });
	} catch (e) {
		uni.showModal({
			title: "需要录音权限",
			content: "请在设置中允许使用麦克风",
			showCancel: false,
		});
		return;
	}

	if (!recognitionManager.value) {
		uni.showToast({ title: "语音识别未初始化", icon: "none" });
		return;
	}

	recording.value = true;
	recordTip.value = "松开结束";
	recordStartTime.value = Date.now();
	recognitionManager.value.start({ lang: "zh_CN" });
	// #endif

	if (!supported) {
		uni.showToast({ title: "当前平台暂不支持语音输入", icon: "none" });
	}
}

function stopAiRecord() {
	// #ifdef MP-WEIXIN
	if (recognitionManager.value) {
		recognitionManager.value.stop();
	}
	// #endif
}

function handleAiLongPress() {
	longPressTriggered.value = true;
	startAiRecord();
}

function handleAiTouchEnd() {
	if (recording.value) {
		recordTip.value = "识别中...";
		stopAiRecord();
	}
}

function handleAiTap() {
	if (longPressTriggered.value) {
		longPressTriggered.value = false;
		return;
	}
	// 短按打开自定义文字输入弹窗
	aiModalVisible.value = true;
}

function closeAiModal() {
	aiModalVisible.value = false;
}

function handleAiConfirm(text) {
	aiModalVisible.value = false;
	if (text && text.trim()) {
		processAiText(text.trim());
	}
}

async function processAiText(text) {
	try {
		uni.showLoading({ title: "AI 解析中...", mask: true });
		const data = await parseDiaryByText(text, myTag, persons.value);
		uni.hideLoading();
		await executeAiAdd(data);
	} catch (e) {
		uni.hideLoading();
	}
}

// 将 AI 返回的人物标识解析为前端统一使用的数据库 person id
function resolvePerson(raw) {
	if (!raw) return "both";
	const text = String(raw).trim();
	// 「我 / 自己 / me」统一映射到当前登录用户身份
	if (text === "我" || text === "自己" || text.toLowerCase() === "me")
		return myPersonId;
	// 其余入口统一在边界层归一化为数据库 id，业务主链路只继续使用 id。
	return normalizePersonId(text, persons.value);
}

async function executeAiAdd(data, originalText) {
	if (!data || !data.date || !data.event) {
		uni.showModal({
			title: "AI 解析不完整",
			content: "未返回日期或事件，请换个说法试试",
			showCancel: false,
		});
		return;
	}

	// person：先统一归一化为前端数据库 id，再转换为接口提交值。
	const personId = resolvePerson(data.person);
	const person = toPersonPayload(personId, persons.value);

	// event 必须是已定义的事件类型中文名
	const type = EVENT_TYPES.find((item) => item.name === data.event);
	if (!type) {
		uni.showModal({
			title: "事件类型不支持",
			content: `AI 返回 "${data.event}"，不在支持列表中`,
			showCancel: false,
		});
		return;
	}

	try {
		uni.showLoading({ title: "添加中...", mask: true });
		await createDiary({
			date: data.date,
			person,
			event: data.event,
			eventRemark: data.event_remark || originalText || "",
			attachments: Array.isArray(data.attachments)
				? data.attachments
				: [],
		});
		uni.hideLoading();
		uni.showToast({ title: "添加成功", icon: "success" });
		await refreshCalendar();
	} catch (e) {
		uni.hideLoading();
	}
}

/* ---- 选中日期 ---- */
const selectedDate = ref(null);
const modalVisible = ref(false);

/* ---- 是否是当前月 ---- */
const isCurrentMonth = computed(() => {
	const today = new Date();
	return (
		currentYear.value === today.getFullYear() &&
		currentMonth.value === today.getMonth()
	);
});

/* ---- 状态栏 & 胶囊按钮适配（微信 / APK 兼容） ---- */
const navBarStyle = computed(() => {
	const sys = uni.getSystemInfoSync();
	const statusBarHeight = sys.statusBarHeight || 0;
	try {
		// #ifdef MP-WEIXIN
		const menu = uni.getMenuButtonBoundingClientRect();
		if (menu && menu.bottom) {
			const navHeight = menu.bottom + 8;
			const padRight = sys.windowWidth - menu.left + 12;
			return {
				paddingTop: statusBarHeight + "px",
				height: navHeight - statusBarHeight + "px",
				lineHeight: menu.height + "px",
				paddingLeft: "20px",
				paddingRight: padRight + "px",
			};
		}
		// #endif
		// APK / H5 回退：留出状态栏高度 + 默认导航栏 44px
		return {
			paddingTop: statusBarHeight + "px",
			height: "44px",
			lineHeight: "44px",
			paddingLeft: "20px",
			paddingRight: "20px",
		};
	} catch (e) {
		return {
			paddingTop: statusBarHeight + "px",
			height: "44px",
			lineHeight: "44px",
			paddingLeft: "20px",
			paddingRight: "20px",
		};
	}
});

/* ====== 生成日历网格 ====== */
const gridCells = ref([]);
const loading = ref(false);
const monthDataRef = ref({}); // 缓存当月数据

async function buildGrid() {
	const year = currentYear.value;
	const month = currentMonth.value;
	const today = new Date();
	const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

	const firstDay = new Date(year, month, 1).getDay();
	const startOffset = firstDay === 0 ? 6 : firstDay - 1;
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const daysInPrevMonth = new Date(year, month, 0).getDate();

	loading.value = true;
	const monthData = await getMonthData(year, month);
	monthDataRef.value = monthData;
	loading.value = false;

	const cells = [];
	const totalCells = 42;

	for (let i = 0; i < totalCells; i++) {
		let day;
		let isCurrentMonthCell;
		let dateYear;
		let dateMonth;

		if (i < startOffset) {
			day = daysInPrevMonth - startOffset + i + 1;
			isCurrentMonthCell = false;
			dateYear = month === 0 ? year - 1 : year;
			dateMonth = month === 0 ? 11 : month - 1;
		} else if (i - startOffset >= daysInMonth) {
			day = i - startOffset - daysInMonth + 1;
			isCurrentMonthCell = false;
			dateYear = month === 11 ? year + 1 : year;
			dateMonth = month === 11 ? 0 : month + 1;
		} else {
			day = i - startOffset + 1;
			isCurrentMonthCell = true;
			dateYear = year;
			dateMonth = month;
		}

		const mm = String(dateMonth + 1).padStart(2, "0");
		const dd = String(day).padStart(2, "0");
		const key = `${dateYear}-${mm}-${dd}`;
		const data = monthData[key];
		const status = data?.status?.status;

		const statusDef = status
			? DATE_STATUSES.find((item) => item.id === status) ||
			DATE_STATUSES[0]
			: DATE_STATUSES[0];

		const personSet = new Set();
		if (data) {
			data.events.forEach((event) => {
				const personId = normalizePersonId(
					event.person || "both",
					persons.value,
				);
				personSet.add(personId);
			});
		}

		const personDots = [...personSet].map((personId) => {
			const person = findPersonById(personId, persons.value);
			return person ? { color: person.color } : { color: "#9B59B6" };
		});

		const countTotal = data ? data.events.length : 0;

		cells.push({
			year: dateYear,
			month: dateMonth,
			day,
			isCurrentMonth: isCurrentMonthCell,
			isToday: key === todayKey,
			key,
			status: status || "normal",
			statusColor:
				statusDef.color !== "transparent" ? statusDef.color : "",
			personDots,
			countTotal,
		});
	}

	gridCells.value = cells;
}

/* ====== 选中日期的事件（从缓存取，不额外请求） ====== */
const selectedEvents = computed(() => {
	if (!selectedDate.value) return [];
	const key = `${selectedDate.value.year}-${String(selectedDate.value.month + 1).padStart(2, "0")}-${String(selectedDate.value.day).padStart(2, "0")}`;
	const data = monthDataRef.value[key];
	return data ? data.events : [];
});

/* ====== 选择日期 ====== */
function selectDate(cell) {
	selectedDate.value = {
		year: cell.year,
		month: cell.month,
		day: cell.day,
		status: cell.status,
	};
	modalVisible.value = true;
}

function closeModal() {
	modalVisible.value = false;
}

async function refreshCalendar() {
	await buildGrid();
	// 同步更新弹窗日期状态，避免关闭重开后显示旧状态
	if (selectedDate.value) {
		const cell = gridCells.value.find(
			(item) =>
				item.year === selectedDate.value.year &&
				item.month === selectedDate.value.month &&
				item.day === selectedDate.value.day,
		);
		if (cell) {
			selectedDate.value = { ...selectedDate.value, status: cell.status };
		}
	}
}

/* ====== 月份切换 ====== */
function prevMonth() {
	if (currentMonth.value === 0) {
		currentYear.value--;
		currentMonth.value = 11;
	} else {
		currentMonth.value--;
	}
}

function nextMonth() {
	if (currentMonth.value === 11) {
		currentYear.value++;
		currentMonth.value = 0;
	} else {
		currentMonth.value++;
	}
}

function goToday() {
	const today = new Date();
	currentYear.value = today.getFullYear();
	currentMonth.value = today.getMonth();
}

function goToStats() {
	uni.navigateTo({ url: "/pages/statistics/index" });
}

function goToUser() {
	uni.navigateTo({ url: "/pages/user/index" });
}

function goToMeal() {
	uni.navigateTo({ url: "/pages/weekly-meal/index" });
}

watch([currentYear, currentMonth, persons], buildGrid, { immediate: true });
</script>

<style lang="scss" scoped>
/* ====== 根容器 ====== */
.calendar-page {
	background: linear-gradient(180deg,
			var(--theme-page-top) 0%,
			var(--theme-page-mid) 220rpx,
			var(--theme-page-bottom) 100%);
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.calendar-page.theme-dark {
	background: linear-gradient(180deg,
			var(--theme-page-top-dark) 0%,
			var(--theme-page-mid-dark) 220rpx,
			var(--theme-page-bottom-dark) 100%);
}

/* ====== 顶部栏 ====== */
.top-bar {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.top-left {
	display: flex;
	align-items: center;
}

.top-left .top-theme {
	margin-left: 10rpx;
	padding: 8rpx;
}

.top-year {
	font-size: 48rpx;
	font-weight: 700;
	color: #1a1a1a;
}

.theme-dark .top-year {
	color: #e5e5e7;
}

.top-right {
	display: flex;
}

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

.theme-dark .top-btn {
	background: #2c2c2e;
}

/* ====== 月份导航 ====== */
.month-nav {
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

.theme-dark .nav-arrow {
	color: #8e8e93;
}

.nav-title {
	font-size: 36rpx;
	font-weight: 600;
	color: #1a1a1a;
	text-align: center;
	width: 120rpx;
}

.theme-dark .nav-title {
	color: #e5e5e7;
}

/* ====== 星期行 ====== */
.weekday-row {
	display: flex;
	padding: 8rpx 0 12rpx;
}

.weekday-cell {
	flex: 1;
	text-align: center;
	font-size: 22rpx;
	color: #999;
	font-weight: 500;
}

.weekday-weekend {
	color: #ff3b30;
}

.theme-dark .weekday-cell {
	color: #8e8e93;
}

/* ====== 日期网格 ====== */
.calendar-grid {
	display: flex;
	flex-wrap: wrap;
	padding: 0 12rpx;
}

/* ====== 日期单元格 ====== */
.date-cell {
	position: relative;
	width: 14.28%;
	height: 100rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	border-radius: 12rpx;
}

.date-cell--other .date-num {
	color: #c0c0c0;
}

.theme-dark .date-cell--other .date-num {
	color: #636366;
}

.date-cell--today {
	background: var(--theme-soft-bg);
	border-radius: 14rpx;
}

.theme-dark .date-cell--today {
	background: var(--theme-soft-bg-dark);
}

.date-num {
	font-size: 30rpx;
	color: #1a1a1a;
	font-weight: 400;
	line-height: 1;
}

.theme-dark .date-num {
	color: #e5e5e7;
}

.date-num--today {
	color: var(--theme-primary-strong);
	font-weight: 700;
}

.theme-dark .date-num--today {
	color: var(--theme-primary);
}

/* 状态标记(底部小横条) */
.status-mark {
	position: absolute;
	bottom: 8rpx;
	left: 50%;
	transform: translateX(-50%);
	width: 32rpx;
	height: 5rpx;
	border-radius: 3rpx;
}

/* 人物色点(右上角) */
.person-dots {
	position: absolute;
	top: 6rpx;
	right: 6rpx;
	display: flex;
}

.person-dot {
	width: 10rpx;
	height: 10rpx;
	border-radius: 50%;
	margin-left: 3rpx;
}

.person-dot:first-child {
	margin-left: 0;
}

/* 计数角标(左上角) */
.count-badge {
	position: absolute;
	top: 4rpx;
	left: 4rpx;
	font-size: 18rpx;
	font-weight: 700;
	color: #ff9500;
	background: rgba(255, 149, 0, 0.12);
	border-radius: 14rpx;
	padding: 2rpx 8rpx;
	text-align: center;
	line-height: 1.3;
}

/* ====== 今日 FAB ====== */
.today-fab {
	position: fixed;
	bottom: 100rpx;
	left: 50%;
	transform: translateX(-50%);
	background: #1a1a1a;
	color: #fff;
	padding: 14rpx 36rpx;
	border-radius: 40rpx;
	font-size: 24rpx;
	font-weight: 600;
	z-index: 100;
}

.theme-dark .today-fab {
	background: #e5e5e7;
	color: #1c1c1e;
}

/* ====== AI 语音按钮 ====== */
.ai-fab {
	position: fixed;
	bottom: 100rpx;
	right: 40rpx;
	width: 104rpx;
	height: 104rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-secondary) 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 12rpx 32rpx var(--theme-ring);
	z-index: 100;
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease;
}

.ai-fab::before {
	content: "";
	position: absolute;
	top: -6rpx;
	right: -6rpx;
	bottom: -6rpx;
	left: -6rpx;
	border-radius: 50%;
	background: linear-gradient(135deg,
			var(--theme-ring) 0%,
			var(--theme-soft-bg-dark) 100%);
	z-index: -1;
	animation: ai-halo 2.4s ease-in-out infinite;
}

.ai-fab:active {
	transform: scale(0.92);
	box-shadow: 0 6rpx 18rpx var(--theme-ring);
}

.ai-fab--recording {
	background: linear-gradient(135deg, #ff3b30 0%, #ff6b35 100%);
	box-shadow: 0 12rpx 32rpx rgba(255, 59, 48, 0.45);
}

.ai-fab--recording::before {
	background: linear-gradient(135deg,
			rgba(255, 59, 48, 0.4) 0%,
			rgba(255, 107, 53, 0.25) 100%);
	animation: ai-halo 1.2s ease-in-out infinite;
}

@keyframes ai-halo {
	0% {
		transform: scale(1);
		opacity: 0.6;
	}

	50% {
		transform: scale(1.08);
		opacity: 0.2;
	}

	100% {
		transform: scale(1);
		opacity: 0.6;
	}
}

/* ====== 录音中浮层 ====== */
.record-overlay {
	position: fixed;
	top: 0;
	right: 0;
	bottom: 0;
	left: 0;
	background: rgba(0, 0, 0, 0.55);
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
}

.record-bubble {
	width: 300rpx;
	height: 300rpx;
	border-radius: 40rpx;
	background: rgba(0, 0, 0, 0.65);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	backdrop-filter: blur(6rpx);
}

.record-pulse {
	position: relative;
	width: 140rpx;
	height: 140rpx;
	border-radius: 50%;
	background: #ff3b30;
	display: flex;
	align-items: center;
	justify-content: center;
}

.record-ring {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 140rpx;
	height: 140rpx;
	border-radius: 50%;
	background: rgba(255, 59, 48, 0.45);
	transform: translate(-50%, -50%);
	animation: record-pulse 1.4s ease-out infinite;
}

.record-ring--2 {
	animation-delay: 0.7s;
}

@keyframes record-pulse {
	0% {
		width: 140rpx;
		height: 140rpx;
		opacity: 0.8;
	}

	100% {
		width: 260rpx;
		height: 260rpx;
		opacity: 0;
	}
}

.record-text {
	margin-top: 28rpx;
	font-size: 28rpx;
	font-weight: 500;
	color: #fff;
}
</style>
