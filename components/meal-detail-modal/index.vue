<template>
	<view class="modal-mask" :class="{ 'modal-dark': isDark }" v-if="visible" @tap="$emit('close')">
		<view class="modal-sheet" @tap.stop>
			<!-- 标题：日期 + 餐次 -->
			<view class="sheet-head">
				<text class="head-date">{{ weekdayLabel }} · {{ mealName }}</text>
				<text class="head-weekday">{{ dateText }}</text>
			</view>

			<!-- ====== 菜单列表 ====== -->
			<view class="block">
				<view class="block-title">
					<text>菜单</text>
					<text v-if="!dishes.length" class="muted">— 暂无</text>
				</view>
				<view v-if="dishes.length" class="dish-list">
					<view v-for="(dish, i) in dishes" :key="i" class="dish-item">
						<view class="dish-left" @tap="onToggle(i)">
							<view class="dish-check" :class="{ 'dish-check--done': dish.done }">
								<text v-if="dish.done" class="dish-tick">✓</text>
							</view>
							<text class="dish-name" :class="{ 'dish-name--done': dish.done }">{{ dish.name }}</text>
						</view>
						<text class="del-btn" @tap.stop="onRemove(i)">x</text>
					</view>
				</view>
			</view>

			<!-- ====== 添加菜品 ====== -->
			<view class="block">
				<view class="block-title">添加</view>
				<view class="add-bar">
					<input class="add-input" v-model="addInput" placeholder="输入菜名，如 番茄炒蛋" confirm-type="done" @confirm="onAdd" />
					<text class="add-btn" @tap="onAdd">+</text>
				</view>
			</view>

			<!-- 底部 -->
			<view class="sheet-foot">
				<text v-if="dishes.length" class="foot-link danger" @tap="$emit('clear')">清空全部</text>
				<text class="foot-link" @tap="$emit('close')">关闭</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, watch } from "vue";
import { getTheme } from "@/store/theme.js";

const props = defineProps({
	visible: { type: Boolean, default: false },
	weekdayLabel: { type: String, default: "" },
	dateText: { type: String, default: "" },
	mealName: { type: String, default: "" },
	dishes: { type: Array, default: () => [] },
});

const emit = defineEmits(["close", "toggle", "remove", "add", "clear"]);

const isDark = ref(getTheme() === "dark");
const addInput = ref("");

// 每次弹窗打开时同步主题并清空输入框，
// 这样 setup 化之后仍保持和原先 setup() 返回对象一致的行为。
watch(
	() => props.visible,
	(visible) => {
		if (visible) {
			isDark.value = getTheme() === "dark";
			addInput.value = "";
		}
	},
	{ immediate: true },
);

function onToggle(index) {
	emit("toggle", index);
}

function onRemove(index) {
	emit("remove", index);
}

function onAdd() {
	const name = addInput.value.trim();
	if (!name) return;
	emit("add", name);
	addInput.value = "";
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

/* ====== 标题 ====== */
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

/* ====== 菜单项 ====== */
.dish-list {
	display: flex;
	flex-direction: column;
}

.dish-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx;
	background: #f8f8f8;
	border-radius: 16rpx;
	margin-bottom: 10rpx;
}

.dish-item:last-child {
	margin-bottom: 0;
}

.modal-dark .dish-item {
	background: #2c2c2e;
}

.dish-left {
	display: flex;
	align-items: center;
	flex: 1;
	overflow: hidden;
}

.dish-check {
	width: 36rpx;
	height: 36rpx;
	border-radius: 50%;
	border: 2rpx solid #ccc;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.dish-check--done {
	background: #1d9e75;
	border-color: #1d9e75;
}

.dish-tick {
	font-size: 24rpx;
	color: #fff;
	line-height: 1;
}

.dish-name {
	font-size: 28rpx;
	font-weight: 500;
	color: #1a1a1a;
	margin-left: 16rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.modal-dark .dish-name {
	color: #e5e5e7;
}

.dish-name--done {
	color: #999;
	text-decoration: line-through;
}

.del-btn {
	font-size: 32rpx;
	color: #ccc;
	padding: 4rpx;
	font-weight: 300;
	flex-shrink: 0;
	margin-left: 14rpx;
}

.modal-dark .del-btn {
	color: #636366;
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
