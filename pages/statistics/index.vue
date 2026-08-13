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
			<view v-if="person.displayTypes.length" class="pc-types">
				<view v-for="t in person.displayTypes" :key="t.id" class="pc-type-item">
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

			<!-- 体重使用折线图单独展示，避免和普通“次数统计”混在一起 -->
			<view v-if="person.weight.total > 0" class="weight-panel">
				<view class="weight-head">
					<view class="weight-title-wrap">
						<app-icon name="weight" :size="34" :color="person.weight.color" />
						<text class="weight-title">体重趋势</text>
					</view>
					<text class="weight-times">记录 {{ person.weight.total }} 次</text>
				</view>

				<view v-if="person.weight.points.length" class="weight-summary">
					<view class="weight-metric">
						<text class="weight-metric-label">最新</text>
						<text class="weight-metric-value">{{
							formatWeight(person.weight.latest)
						}}</text>
					</view>
					<view class="weight-metric">
						<text class="weight-metric-label">最低</text>
						<text class="weight-metric-value">{{
							formatWeight(person.weight.min)
						}}</text>
					</view>
					<view class="weight-metric">
						<text class="weight-metric-label">最高</text>
						<text class="weight-metric-value">{{
							formatWeight(person.weight.max)
						}}</text>
					</view>
				</view>

				<view v-if="person.weight.points.length" class="weight-chart-wrap">
					<trend-line-chart :points="person.weight.points" :color="person.weight.color" unit="kg" :dark="isDark" />
				</view>

				<text v-else class="empty-text">已记录体重事件，但备注里还没有可识别的数值</text>
			</view>

			<text v-if="!person.displayTypes.length && person.weight.total === 0" class="empty-text">暂无数据</text>
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
import { loadPersons, normalizePersonId } from "@/store/persons.js";
import { getTheme } from "@/store/theme.js";
import { getCurrentProfileThemeClass } from "@/store/profile-theme.js";
import AppIcon from "@/components/app-icon/index.vue";
import TrendLineChart from "@/components/trend-line-chart/index.vue";

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
        { id: "lastMonth", label: "上个月" },
];
const period = ref("week");

const stats = ref({ week: [], month: [], lastMonth: [] });
const rawEvents = ref({ week: [], month: [], lastMonth: [] });
const activeDaysCount = ref({ week: 0, month: 0, lastMonth: 0 });

/* ---- 动态人物列表 ---- */
const persons = ref(PERSONS);

function getSeedPersons(list = []) {
	const seed = list.slice();
	PERSONS.forEach((person) => {
		if (!seed.find((item) => item.id === person.id)) seed.push(person);
	});
	return seed;
}

function formatWeight(value) {
	if (typeof value !== "number" || Number.isNaN(value)) return "--";
	return `${value.toFixed(1)}kg`;
}

function parseWeightValue(text) {
	if (!text) return null;

	// 体重备注里可能混有“62.5kg”“126斤”“晨起 62.3”这类文本，
	// 这里优先提取一个合理区间内的数值，避免误把日期、步数等大数字当成体重。
	const matches = String(text).match(/-?\d+(?:\.\d+)?/g);
	if (!matches || !matches.length) return null;

	for (const raw of matches) {
		const value = Number(raw);
		if (!Number.isFinite(value)) continue;
		if (value >= 20 && value <= 300) return value;
	}

	return null;
}

function createEmptyWeightStats() {
	return {
		points: [],
		min: null,
		max: null,
		latest: null,
	};
}

function buildWeightStats(points) {
	if (!points.length) return createEmptyWeightStats();
	const values = points.map((point) => point.value);
	const min = Math.min(...values);
	const max = Math.max(...values);
	return {
		points,
		min,
		max,
		latest: points[points.length - 1] ? points[points.length - 1].value : null,
	};
}

function buildWeightSeriesMap(events, personList) {
	const seedPersons = getSeedPersons(personList);
	const result = {};

	seedPersons.forEach((person) => {
		result[person.id] = createEmptyWeightStats();
	});

	const grouped = {};
	events.forEach((event) => {
		if (event.type !== "weight") return;

		const personId = normalizePersonId(event.person || "both", personList);
		const value = parseWeightValue(event.title);
		if (value === null) return;

		if (!grouped[personId]) grouped[personId] = [];
		grouped[personId].push({
			id: event.id || `${event.date}-${personId}-${grouped[personId].length}`,
			date: event.date || "",
			value,
			createdAt: event.createdAt || "",
		});
	});

	Object.keys(grouped).forEach((personId) => {
		grouped[personId].sort((a, b) => {
			if (a.date !== b.date) return String(a.date).localeCompare(String(b.date));
			return String(a.createdAt).localeCompare(String(b.createdAt));
		});
		result[personId] = buildWeightStats(grouped[personId]);
	});

	return result;
}

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

        // 上个月
        // 这里先定位到上个月 1 号，再取该月最后一天。
        // 这样跨年场景（例如 1 月查看上一年 12 月）也能自然兼容。
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEvents = await getDateRangeEvents(
                dateKey(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1),
                dateKey(
                        lastMonthDate.getFullYear(),
                        lastMonthDate.getMonth(),
                        new Date(
                                lastMonthDate.getFullYear(),
                                lastMonthDate.getMonth() + 1,
                                0,
                        ).getDate(),
                ),
        );

	rawEvents.value = {
		week: weekEvents,
		month: monthEvents,
                lastMonth: lastMonthEvents,
	};
	stats.value = {
		week: aggregateByPersonThenType(weekEvents, persons.value),
		month: aggregateByPersonThenType(monthEvents, persons.value),
                lastMonth: aggregateByPersonThenType(lastMonthEvents, persons.value),
	};
	activeDaysCount.value = {
		week: new Set(weekEvents.map((event) => event.date || "")).size,
		month: new Set(monthEvents.map((event) => event.date || "")).size,
                lastMonth: new Set(lastMonthEvents.map((event) => event.date || "")).size,
	};
}

// 这里保留初始化时先拉人物、再拉统计的顺序，
// 是为了保证统计分组使用的是最新人物列表，而不是旧的兜底常量。
(async () => {
	persons.value = await loadPersons();
	await loadStats();
})();

const personStats = computed(() => {
	const list = stats.value[period.value] || [];
	const weightSeriesMap = buildWeightSeriesMap(
		rawEvents.value[period.value] || [],
		persons.value,
	);

	// 这里把“体重”从普通类型列表里剥离出来：
	// 1. 普通事件继续展示次数对比；
	// 2. 体重改为趋势图，才能表达真实变化。
	return list.map((person) => ({
		...person,
		displayTypes: person.types.filter((type) => type.id !== "weight"),
		weight: {
			total:
				person.types.find((type) => type.id === "weight")?.total || 0,
			color:
				person.types.find((type) => type.id === "weight")?.color ||
				"#FF6B6B",
			...(weightSeriesMap[person.id] || createEmptyWeightStats()),
		},
		maxTypeTotal: Math.max(
			1,
			...person.types
				.filter((type) => type.id !== "weight")
				.map((type) => type.total),
		),
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

const activeDays = computed(() => activeDaysCount.value[period.value] || 0);

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
	margin-bottom: 20rpx;
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

/* ====== 体重趋势 ====== */
.weight-panel {
	margin-top: 8rpx;
	padding-top: 20rpx;
	border-top: 1rpx solid #eee;
}

.stats-dark .weight-panel {
	border-top-color: #38383a;
}

.weight-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 20rpx;
}

.weight-title-wrap {
	display: flex;
	align-items: center;
}

.weight-title {
	margin-left: 10rpx;
	font-size: 28rpx;
	font-weight: 700;
	color: #1a1a1a;
}

.stats-dark .weight-title {
	color: #e5e5e7;
}

.weight-times {
	font-size: 24rpx;
	color: #999;
}

.stats-dark .weight-times {
	color: #8e8e93;
}

.weight-summary {
	display: flex;
	justify-content: space-between;
	margin-bottom: 20rpx;
}

.weight-metric {
	flex: 1;
	padding: 18rpx 20rpx;
	border-radius: 18rpx;
	background: rgba(255, 107, 107, 0.08);
	margin-right: 16rpx;
}

.weight-metric:last-child {
	margin-right: 0;
}

.stats-dark .weight-metric {
	background: rgba(255, 107, 107, 0.14);
}

.weight-metric-label {
	display: block;
	font-size: 22rpx;
	color: #999;
	margin-bottom: 6rpx;
}

.stats-dark .weight-metric-label {
	color: #8e8e93;
}

.weight-metric-value {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: #1a1a1a;
}

.stats-dark .weight-metric-value {
	color: #e5e5e7;
}

.weight-chart-wrap {
	display: flex;
	flex-direction: column;
	align-items: center;
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
