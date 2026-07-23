<template>
	<view class="ri-icon" :class="iconClass" :style="iconStyle"></view>
</template>

<script>
// Remix Icon 映射表
const ICON_MAP = {
	water:        'ri-drop-line',
	eat:          'ri-restaurant-line',
	exercise:     'ri-run-line',
	medicine:     'ri-capsule-line',
	study:        'ri-book-open-line',
	weight:       'ri-weight-line',
	meeting:      'ri-calendar-event-line',
	anniversary:  'ri-heart-3-line',
	task:         'ri-checkbox-circle-line',
	custom:       'ri-edit-line',
	husband:      'ri-men-line',
	wife:         'ri-women-line',
	both:         'ri-group-line',
	calendar:     'ri-calendar-line',
	statistics:   'ri-bar-chart-grouped-line',
	sun:          'ri-sun-line',
	moon:         'ri-moon-line',
	mic:          'ri-mic-line',
	ai:           'ri-magic-fill',
	close:        'ri-close-line',
	send:         'ri-send-plane-fill'
}

export default {
	name: 'AppIcon',
	props: {
		name: { type: String, required: true },
		size: { type: Number, default: 40 },
		color: { type: String, default: '#999' }
	},
	computed: {
		iconClass() {
			return ICON_MAP[this.name] || 'ri-edit-line'
		},
		iconStyle() {
			return {
				fontSize: this.size + 'rpx',
				color: this.color,
				lineHeight: 1
			}
		}
	}
}
</script>

<style scoped>
.ri-icon {
	display: inline-block;
	vertical-align: middle;
}
</style>
