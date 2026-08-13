<template>
	<view v-if="chartModel.points.length" class="trend-chart" :class="{ 'trend-chart--dark': dark }">
		<view class="trend-plot" :style="chartModel.plotStyle">
			<view v-for="line in chartModel.gridLines" :key="line.id" class="trend-grid-line" :style="{ top: line.top }">
			</view>
			<view v-for="segment in chartModel.segments" :key="segment.id" class="trend-line"
				:style="[segment.style, { background: lineBackground }]"></view>
			<view v-for="point in chartModel.points" :key="point.id" class="trend-point-wrap" :style="point.wrapStyle">
				<text v-if="showValue" class="trend-point-value" :style="{ color }">
					{{ formatValue(point.value) }}
				</text>
				<view class="trend-point" :style="pointStyle"></view>
			</view>
		</view>
		<view v-if="showAxis" class="trend-axis" :style="chartModel.axisStyle">
			<text class="trend-axis-label trend-axis-label--start">
				{{ chartModel.axisLabels.start }}
			</text>
			<text v-if="chartModel.axisLabels.center" class="trend-axis-label trend-axis-label--center">
				{{ chartModel.axisLabels.center }}
			</text>
			<text class="trend-axis-label trend-axis-label--end">
				{{ chartModel.axisLabels.end }}
			</text>
		</view>
	</view>
</template>
<script setup>
import { computed } from "vue";

const props = defineProps({
	// 原始点数据只需要传 value 和 date；
	// 其余几何信息交给组件内部统一换算，页面层不再关心像素和连线角度。
	points: {
		type: Array,
		default: () => [],
	},
	color: {
		type: String,
		default: "#FF6B6B",
	},
	unit: {
		type: String,
		default: "",
	},
	precision: {
		type: Number,
		default: 1,
	},
	widthRpx: {
		type: Number,
		default: 638,
	},
	heightRpx: {
		type: Number,
		default: 220,
	},
	showValue: {
		type: Boolean,
		default: true,
	},
	showAxis: {
		type: Boolean,
		default: true,
	},
	dark: {
		type: Boolean,
		default: false,
	},
});
const systemInfo = uni.getSystemInfoSync();
function rpxToPx(rpx) {
	return Math.max((systemInfo.windowWidth * rpx) / 750, 1);
}
function formatShortDate(dateText) {
	if (!dateText) return "";
	const parts = String(dateText).split("-");
	if (parts.length !== 3) return dateText;
	return `${parts[1]}/${parts[2]}`;
}
function formatValue(value) {
	if (typeof value !== "number" || Number.isNaN(value)) return "--";
	return `${value.toFixed(props.precision)}${props.unit}`;
}
const pointSizePx = computed(() => rpxToPx(16));
const plotWidthPx = computed(() => Math.max(rpxToPx(props.widthRpx), 220));
const plotHeightPx = computed(() => Math.max(rpxToPx(props.heightRpx), 120));
const pointStyle = computed(() => ({
	width: `${pointSizePx.value}px`,
	height: `${pointSizePx.value}px`,
	borderColor: props.color,
}));
const lineBackground = computed(
	() => `linear-gradient(90deg, rgba(255, 107, 107, 0.55), ${props.color})`,
);
const chartModel = computed(() => {
	if (!props.points.length) {
		return {
			points: [],
			segments: [],
			gridLines: [],
			plotStyle: {
				width: `${plotWidthPx.value}px`,
				height: `${plotHeightPx.value}px`,
			},
			axisStyle: {
				width: `${plotWidthPx.value}px`,
			},
			axisLabels: {
				start: "",
				center: "",
				end: "",
			},
		};
	}
	const values = props.points.map((point) => point.value);
	const min = Math.min(...values);
	const max = Math.max(...values);
	const rawRange = max - min;
	const padding = rawRange > 0 ? Math.max(rawRange * 0.15, 0.5) : 1;
	const scaleMin = min - padding;
	const scaleMax = max + padding;
	const scaleRange = Math.max(scaleMax - scaleMin, 1);
	const points = props.points.map((point, index) => {
		const xPx =
			props.points.length === 1
				? plotWidthPx.value / 2
				: (index / (props.points.length - 1)) * plotWidthPx.value;
		const yRatio = (scaleMax - point.value) / scaleRange;
		const yPx = yRatio * plotHeightPx.value;

		return {
			...point,
			xPx,
			yPx,
			wrapStyle: {
				left: `${xPx}px`,
				top: `${yPx}px`,
			},
		};
	});
	const segments = points.slice(1).map((point, index) => {
		const prev = points[index];
		const dx = point.xPx - prev.xPx;
		const dy = point.yPx - prev.yPx;
		const distance = Math.sqrt(dx * dx + dy * dy);
		const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

		return {
			id: `${prev.id}-${point.id}`,
			style: {
				left: `${prev.xPx}px`,
				top: `${prev.yPx}px`,
				width: `${distance}px`,
				transform: `rotate(${angle}deg)`,
			},
		};
	});
	const middleIndex = Math.floor((points.length - 1) / 2);
	const startLabel = props.points[0]?.label || formatShortDate(props.points[0]?.date);
	const endLabel =
		props.points[props.points.length - 1]?.label ||
		formatShortDate(props.points[props.points.length - 1]?.date);
	const centerLabel =
		points.length >= 3
			? props.points[middleIndex]?.label ||
			formatShortDate(props.points[middleIndex]?.date)
			: "";
	return {
		points,
		segments,
		gridLines: [
			{ id: "top", top: "0%" },
			{ id: "middle", top: "50%" },
			{ id: "bottom", top: "100%" },
		],
		plotStyle: {
			width: `${plotWidthPx.value}px`,
			height: `${plotHeightPx.value}px`,
		},
		axisStyle: {
			width: `${plotWidthPx.value}px`,
		},
		axisLabels: {
			start: startLabel,
			center: centerLabel && centerLabel !== startLabel && centerLabel !== endLabel ? centerLabel : "",
			end: endLabel,
		},
	};
});
</script>
<style lang="scss" scoped>
.trend-chart {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.trend-plot {
	position: relative;
}

.trend-grid-line {
	position: absolute;
	left: 0;
	right: 0;
	border-top: 1rpx dashed rgba(255, 107, 107, 0.28);
}

.trend-chart--dark .trend-grid-line {
	border-top-color: rgba(255, 107, 107, 0.36);
}

.trend-line {
	position: absolute;
	height: 4rpx;
	border-radius: 999rpx;
	transform-origin: left center;
}

.trend-point-wrap {
	position: absolute;
	transform: translate(-50%, -50%);
	display: flex;
	flex-direction: column;
	align-items: center;
}

.trend-point-value {
	position: absolute;
	bottom: 34rpx;
	white-space: nowrap;
	font-size: 20rpx;
	font-weight: 600;
	line-height: 1;
}

.trend-point {
	border-radius: 50%;
	border-width: 4rpx;
	border-style: solid;
	background: #fff;
	box-shadow: 0 4rpx 12rpx rgba(255, 107, 107, 0.16);
}

.trend-chart--dark .trend-point {
	background: #1c1c1e;
}

.trend-axis {
	position: relative;
	margin-top: 12rpx;
}

.trend-axis-label {
	position: absolute;
	top: 0;
	font-size: 22rpx;
	color: #999;
	transform: translateX(-50%);
}

.trend-chart--dark .trend-axis-label {
	color: #8e8e93;
}

.trend-axis-label--start {
	left: 0;
	transform: none;
}

.trend-axis-label--center {
	left: 50%;
}

.trend-axis-label--end {
	right: 0;
	left: auto;
	transform: none;
}
</style>
