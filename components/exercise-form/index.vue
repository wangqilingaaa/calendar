<template>
	<view class="exercise-form" :class="{ 'exercise-form-dark': dark }">
		<view class="ex-field">
			<text class="ex-label">动作</text>
			<view class="ex-input-wrap">
				<input class="ex-input" v-model="action" placeholder="输入或选择动作，如 卧推、深蹲"
					placeholder-class="ex-placeholder" confirm-type="done" />
			</view>
			<view v-if="suggestions.length" class="ex-suggest">
				<view v-for="name in suggestions" :key="name" class="ex-suggest-chip"
					:class="{ active: actionKeyword === name }" @tap="action = name">{{ name }}</view>
			</view>
			<text v-else-if="!searching" class="ex-suggest-empty">没有匹配动作，将直接使用自定义名称</text>
		</view>

		<view class="ex-metrics">
			<view class="ex-metric">
				<text class="ex-label">组数</text>
				<view class="ex-metric-box">
					<input class="ex-metric-input" type="number" v-model="sets" :maxlength="2" confirm-type="done" />
					<text class="ex-metric-unit">组</text>
				</view>
			</view>
			<view class="ex-metric">
				<text class="ex-label">次数</text>
				<view class="ex-metric-box">
					<input class="ex-metric-input" type="number" v-model="reps" :maxlength="3" confirm-type="done" />
					<text class="ex-metric-unit">次</text>
				</view>
			</view>
			<view class="ex-metric">
				<text class="ex-label">重量</text>
				<view class="ex-metric-box">
					<input class="ex-metric-input" type="digit" v-model="weight" placeholder="选填"
						placeholder-class="ex-placeholder" confirm-type="done" />
					<text class="ex-metric-unit">kg</text>
				</view>
			</view>
		</view>

		<view class="ex-field">
			<text class="ex-label">备注</text>
			<view class="ex-input-wrap">
				<input class="ex-input" v-model="note" placeholder="选填，如 第一个动作、状态不错"
					placeholder-class="ex-placeholder" confirm-type="done" @confirm="handleSubmit" />
			</view>
		</view>

		<view class="ex-submit" @tap="handleSubmit">
			<app-icon name="exercise" :size="32" color="#fff" />
			<text>{{ editing ? "保存修改" : "添加健身记录" }}</text>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import AppIcon from "@/components/app-icon/index.vue";
import { searchGymActions } from "@/api/gym-actions.js";
import { parseExerciseTitle, formatExerciseTitle } from "@/utils/exercise.js";

const props = defineProps({
	// 旧版运动日记事件编辑时回填的备注文本，挂载时解析为结构化字段
	initialTitle: {
		type: String,
		default: "",
	},
	// 结构化健身记录编辑时回填的字段，优先级高于 initialTitle
	initial: {
		type: Object,
		default: null,
	},
	editing: {
		type: Boolean,
		default: false,
	},
	dark: {
		type: Boolean,
		default: false,
	},
});

// 校验与文本拼装在组件内完成，宿主只负责落库
const emit = defineEmits(["submit"]);

const DEFAULT_SETS = "4";
const DEFAULT_REPS = "10";

const action = ref("");
const sets = ref(DEFAULT_SETS);
const reps = ref(DEFAULT_REPS);
const weight = ref("");
const note = ref("");

const actionKeyword = computed(() => action.value.trim());

function fillFromSource() {
	action.value = "";
	sets.value = DEFAULT_SETS;
	reps.value = DEFAULT_REPS;
	weight.value = "";
	note.value = "";

	// 结构化健身记录直接回填，无需再从文本解析
	if (props.initial && (props.initial.action || props.initial.action_name)) {
		const source = props.initial;
		action.value = source.action || source.action_name || "";
		sets.value = String(source.sets || DEFAULT_SETS);
		reps.value = String(source.reps || DEFAULT_REPS);
		const weightValue = Number(source.weight);
		weight.value =
			Number.isFinite(weightValue) && weightValue > 0
				? String(weightValue)
				: "";
		note.value = source.note || "";
		return;
	}

	const parsed = parseExerciseTitle(props.initialTitle);
	if (!parsed) return;
	action.value = parsed.action;
	if (parsed.hasMetrics) {
		sets.value = parsed.sets;
		reps.value = parsed.reps;
	}
	weight.value = parsed.weight;
	note.value = parsed.note;
}

fillFromSource();
watch(
	() => [props.initialTitle, props.initial],
	() => fillFromSource(),
);

// 动作库联想：输入停顿 250ms 后搜索，过期结果直接丢弃
const suggestions = ref([]);
const searching = ref(false);
let searchTimer = null;
let searchSeq = 0;

async function loadSuggestions(keyword) {
	const seq = ++searchSeq;
	searching.value = true;
	try {
		const list = await searchGymActions(keyword, 6);
		if (seq !== searchSeq) return;
		suggestions.value = (list || []).map((item) => item.name);
	} catch (_) {
		// 搜索失败时保留当前联想结果，不打断录入
	} finally {
		if (seq === searchSeq) searching.value = false;
	}
}

watch(actionKeyword, (keyword) => {
	clearTimeout(searchTimer);
	searchTimer = setTimeout(() => loadSuggestions(keyword), 250);
});

onMounted(() => loadSuggestions(actionKeyword.value));
onBeforeUnmount(() => clearTimeout(searchTimer));

function handleSubmit() {
	if (!actionKeyword.value) {
		uni.showToast({ title: "请输入动作名称", icon: "none" });
		return;
	}
	const setsValue = parseInt(sets.value, 10);
	if (!setsValue || setsValue <= 0) {
		uni.showToast({ title: "请填写组数", icon: "none" });
		return;
	}
	const repsValue = parseInt(reps.value, 10);
	if (!repsValue || repsValue <= 0) {
		uni.showToast({ title: "请填写次数", icon: "none" });
		return;
	}
	const weightText = weight.value.trim();
	const weightValue = parseFloat(weightText);
	if (weightText && (!Number.isFinite(weightValue) || weightValue <= 0)) {
		uni.showToast({ title: "重量填写有误", icon: "none" });
		return;
	}

	// 同时输出结构化字段与可读文本：
	// 新记录走健身记录接口存结构化字段，旧版运动日记编辑仍用 title 回写备注
	emit("submit", {
		title: formatExerciseTitle({
			action: actionKeyword.value,
			sets: setsValue,
			reps: repsValue,
			weight:
				Number.isFinite(weightValue) && weightValue > 0
					? Number(weightValue.toFixed(2))
					: "",
			note: note.value.trim(),
		}),
		action: actionKeyword.value,
		sets: setsValue,
		reps: repsValue,
		weight:
			Number.isFinite(weightValue) && weightValue > 0
				? Number(weightValue.toFixed(2))
				: "",
		note: note.value.trim(),
	});
}

// 保存成功后保留组次，便于连续记录下一个动作
function resetAfterAdd() {
	action.value = "";
	weight.value = "";
	note.value = "";
}

defineExpose({ resetAfterAdd });
</script>

<style lang="scss" scoped>
.exercise-form {
	background: #f8f8f8;
	border-radius: 20rpx;
	padding: 24rpx;
}

.exercise-form-dark {
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

.exercise-form-dark .ex-label {
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

.exercise-form-dark .ex-suggest-chip {
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

.exercise-form-dark .ex-suggest-chip.active {
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

.exercise-form-dark .ex-suggest-empty {
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

.exercise-form-dark .ex-metric-box {
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

.exercise-form-dark .ex-metric-input {
	color: #e5e5e7;
}

.ex-metric-unit {
	font-size: 22rpx;
	color: #999;
	margin-left: 4rpx;
}

.exercise-form-dark .ex-metric-unit {
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

.exercise-form-dark .ex-input-wrap {
	background: #3a3a3c;
	border-color: #48484a;
}

.ex-input {
	flex: 1;
	height: 72rpx;
	font-size: 26rpx;
	color: #1a1a1a;
}

.exercise-form-dark .ex-input {
	color: #e5e5e7;
}

.ex-placeholder {
	color: #bbb;
	font-size: 26rpx;
}

.exercise-form-dark .ex-placeholder {
	color: #636366;
}

.ex-submit {
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

.ex-submit:active {
	opacity: 0.85;
}

.ex-submit text {
	margin-left: 10rpx;
}
</style>
