<template>
	<view class="stats-page" :class="[pageThemeClass, { 'stats-dark': isDark }]">
		<!-- 头部 -->
		<view class="stats-head" :style="headStyle">
			<text class="head-back" @tap="goBack">‹</text>
			<text class="head-title">统计</text>
			<view class="head-spacer"></view>
		</view>

		<!-- 模式切换 -->
		<view class="period-row">
			<view v-for="p in periods" :key="p.id" class="period-chip" :class="{ active: period === p.id }"
				@tap="period = p.id">{{ p.label }}</view>
		</view>

		<!-- ====== 概览卡片 ====== -->
		<view class="card overview-card">
			<view class="ov-item">
				<text class="ov-num">{{ activeDays }}</text>
				<text class="ov-label">活跃天</text>
			</view>
			<view class="ov-item">
				<text class="ov-num">{{ totalEvents }}</text>
				<text class="ov-label">总次数</text>
			</view>
			<view class="ov-item">
				<text class="ov-num">{{ uniqueTypes }}</text>
				<text class="ov-label">类别</text>
			</view>
		</view>

		<!-- ====== 人物卡片 ====== -->
		<view v-for="person in personStats" :key="person.id" class="person-card">
			<!-- 人物头部 -->
			<view class="pc-head">
				<view class="pc-head-left">
					<view class="pc-dot" :style="{ backgroundColor: person.color }"></view>
					<text class="pc-name">{{ person.name }}</text>
				</view>
				<text class="pc-total">{{ person.total }} 次</text>
			</view>

			<!-- 类别列表 -->
			<view class="pc-types">
				<view v-for="t in person.types" :key="t.id" class="pc-type-item">
					<view class="pct-left">
						<app-icon :name="t.id" :size="36" :color="t.color" />
						<text class="pct-name">{{ t.name }}</text>
					</view>
					<view class="pct-right">
						<view class="pct-bar-track">
							<view class="pct-bar-fill" :style="{
								width:
									barPercent(
										person.maxTypeTotal,
										t.total,
									) + '%',
								backgroundColor: t.color,
							}"></view>
						</view>
						<text class="pct-count">{{ t.total }}</text>
					</view>
				</view>
			</view>

			<text v-if="!person.types.length" class="empty-text">暂无数据</text>
		</view>

		<view v-if="!personStats.length" class="empty-card">
			<text class="empty-text">暂无数据，去日历添加事件吧</text>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import {
	getDateRangeEvents,
	aggregateByPersonThenType,
	PERSONS,
	dateKey,
} from "@/store/calendar.js";
import { loadPersons } from "@/store/persons.js";
import { getTheme } from "@/store/theme.js";
import { getCurrentProfileThemeClass } from "@/store/profile-theme.js";
import AppIcon from "@/components/app-icon/index.vue";

const isDark = ref(getTheme() === "dark");
const pageThemeClass = ref(getCurrentProfileThemeClass());

// 统计页从“我的”页面返回时，需要刷新根节点主题类，保证配色同步到最新资料。
onShow(() => {
	isDark.value = getTheme() === "dark";
	pageThemeClass.value = getCurrentProfileThemeClass();
});

/* ---- 状态栏 & 胶囊按钮适配（微信 / APK 兼容） ---- */
const headStyle = computed(() => {
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
		// APK / H5 回退
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

const periods = [
	{ id: "week", label: "本周" },
	{ id: "month", label: "本月" },
];
const period = ref("week");

const stats = ref({ week: [], month: [] });
const activeDaysCount = ref(0);

/* ---- 动态人物列表 ---- */
const persons = ref(PERSONS);

async function loadStats() {
	const now = new Date();

	// 本周
	const dow = now.getDay() === 0 ? 7 : now.getDay();
	const monday = new Date(now);
	monday.setDate(now.getDate() - dow + 1);
	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);
	const weekEvents = await getDateRangeEvents(
		dateKey(monday.getFullYear(), monday.getMonth(), monday.getDate()),
		dateKey(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()),
	);

	// 本月
	const monthEvents = await getDateRangeEvents(
		dateKey(now.getFullYear(), now.getMonth(), 1),
		dateKey(
			now.getFullYear(),
			now.getMonth(),
			new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
		),
	);

	stats.value = {
		week: aggregateByPersonThenType(weekEvents, persons.value),
		month: aggregateByPersonThenType(monthEvents, persons.value),
	};
	activeDaysCount.value = new Set(
		weekEvents.map((event) => event.date || ""),
	).size;
}

// 这里保留初始化时先拉人物、再拉统计的顺序，
// 是为了保证统计分组使用的是最新人物列表，而不是旧的兜底常量。
(async () => {
	persons.value = await loadPersons();
	await loadStats();
})();

const personStats = computed(() => {
	const list = stats.value[period.value];
	// 为每个人物计算 maxTypeTotal，用于进度条百分比
	return list.map((person) => ({
		...person,
		maxTypeTotal: Math.max(1, ...person.types.map((type) => type.total)),
	}));
});

const totalEvents = computed(() =>
	personStats.value.reduce((sum, person) => sum + person.total, 0),
);

const uniqueTypes = computed(() => {
	const set = new Set();
	personStats.value.forEach((person) =>
		person.types.forEach((type) => set.add(type.id)),
	);
	return set.size;
});

const activeDays = computed(() => activeDaysCount.value);

function barPercent(max, val) {
	return Math.round((val / max) * 100);
}

function goBack() {
	uni.navigateBack();
}
</script>

<style lang="scss" scoped>
/* ====== 根容器 ====== */
.stats-page {
	background: linear-gradient(180deg,
			var(--theme-page-top) 0%,
			var(--theme-page-mid) 220rpx,
			var(--theme-page-bottom) 100%);
	min-height: 100vh;
	padding-bottom: 60rpx;
}

.stats-dark {
	background: linear-gradient(180deg,
			var(--theme-page-top-dark) 0%,
			var(--theme-page-mid-dark) 220rpx,
			var(--theme-page-bottom-dark) 100%);
}

/* ====== 头部 ====== */
.stats-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.head-back {
	font-size: 52rpx;
	font-weight: 200;
	color: #1a1a1a;
	width: 60rpx;
}

.stats-dark .head-back {
	color: #e5e5e7;
}

.head-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #1a1a1a;
}

.stats-dark .head-title {
	color: #e5e5e7;
}

.head-spacer {
	width: 60rpx;
}

/* ====== 周期切换 ====== */
.period-row {
	display: flex;
	padding: 0 30rpx 20rpx;
}

.period-chip {
	padding: 12rpx 32rpx;
	border-radius: 24rpx;
	font-size: 24rpx;
	color: #999;
	background: #f8f8f8;
	margin-right: 12rpx;
	font-weight: 500;
}

.stats-dark .period-chip {
	color: #8e8e93;
	background: #2c2c2e;
}

.period-chip.active {
	background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
	color: #fff;
	font-weight: 600;
	box-shadow: 0 10rpx 20rpx var(--theme-ring);
}

.stats-dark .period-chip.active {
	background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
	color: #fff;
}

/* ====== 概览卡片 ====== */
.card {
	margin: 0 24rpx 20rpx;
	padding: 32rpx;
	background: #f8f8f8;
	border-radius: 20rpx;
}

.stats-dark .card {
	background: #2c2c2e;
}

.overview-card {
	display: flex;
	justify-content: space-around;
	padding: 24rpx 28rpx;
	background: linear-gradient(135deg, var(--theme-card-start) 0%, var(--theme-card-end) 100%);
}

.stats-dark .overview-card {
	background: linear-gradient(135deg, var(--theme-card-start-dark) 0%, var(--theme-card-end-dark) 100%);
}

.ov-item {
	text-align: center;
}

.ov-num {
	display: block;
	font-size: 44rpx;
	font-weight: 700;
	color: var(--theme-primary-strong);
}

.stats-dark .ov-num {
	color: var(--theme-primary);
}

.ov-label {
	display: block;
	font-size: 22rpx;
	color: #999;
	margin-top: 4rpx;
}

.stats-dark .ov-label {
	color: #8e8e93;
}

/* ====== 人物卡片 ====== */
.person-card {
	margin: 0 24rpx 20rpx;
	padding: 32rpx;
	background: #f8f8f8;
	border-radius: 20rpx;
}

.stats-dark .person-card {
	background: #2c2c2e;
}

.pc-head {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
	padding-bottom: 20rpx;
	border-bottom: 1rpx solid #eee;
}

.stats-dark .pc-head {
	border-bottom-color: #38383a;
}

.pc-head-left {
	display: flex;
	align-items: center;
}

.pc-dot {
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
	margin-right: 12rpx;
}

.pc-name {
	font-size: 30rpx;
	font-weight: 700;
	color: #1a1a1a;
}

.stats-dark .pc-name {
	color: #e5e5e7;
}

.pc-total {
	font-size: 26rpx;
	font-weight: 600;
	color: #999;
}

.stats-dark .pc-total {
	color: #8e8e93;
}

/* ====== 类别列表 ====== */
.pc-types {
	display: flex;
	flex-direction: column;
}

.pc-type-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 14rpx;
}

.pc-type-item:last-child {
	margin-bottom: 0;
}

.pct-left {
	display: flex;
	align-items: center;
	width: 160rpx;
	flex-shrink: 0;
}

.pct-name {
	font-size: 26rpx;
	color: #1a1a1a;
	margin-left: 12rpx;
}

.stats-dark .pct-name {
	color: #e5e5e7;
}

.pct-right {
	flex: 1;
	display: flex;
	align-items: center;
	margin-left: 20rpx;
}

.pct-bar-track {
	flex: 1;
	height: 10rpx;
	background: #fff;
	border-radius: 5rpx;
	overflow: hidden;
}

.stats-dark .pct-bar-track {
	background: #3a3a3c;
}

.pct-bar-fill {
	height: 100%;
	border-radius: 4rpx;
}

.pct-count {
	font-size: 26rpx;
	font-weight: 700;
	color: #1a1a1a;
	margin-left: 16rpx;
	width: 50rpx;
	text-align: right;
	flex-shrink: 0;
}

.stats-dark .pct-count {
	color: #e5e5e7;
}

/* ====== 空态 ====== */
.empty-text {
	font-size: 24rpx;
	color: #999;
	padding: 20rpx 0;
	display: block;
	text-align: center;
}

.stats-dark .empty-text {
	color: #8e8e93;
}

.empty-card {
	margin: 0 24rpx 20rpx;
	padding: 48rpx 32rpx;
	background: #f8f8f8;
	border-radius: 20rpx;
}

.stats-dark .empty-card {
	background: #2c2c2e;
}
</style>
