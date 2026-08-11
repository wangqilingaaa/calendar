<template>
	<view class="user-page" :class="{ 'user-dark': isDark }">
		<!-- 头部 -->
		<view class="user-head" :style="headStyle">
			<text class="head-back" @tap="goBack">‹</text>
			<text class="head-title">我的</text>
			<view class="head-spacer"></view>
		</view>

		<!-- ====== 用户信息卡片 ====== -->
		<view class="card">
			<view class="avatar">{{ userInitial }}</view>
			<view class="user-info">
				<text class="user-name">{{ userName }}</text>
				<text class="user-id">ID: {{ userId }}</text>
				<view v-if="identityTag || gender" class="user-tags">
					<text v-if="identityTag" class="user-tag">{{ identityTag }}</text>
					<text v-if="gender" class="user-tag">{{ gender }}</text>
				</view>
			</view>
		</view>

		<!-- ====== 个人资料 ====== -->
		<view class="section-title">个人资料</view>
		<view class="card profile-card">
			<view class="profile-row" @tap="openEditProfile">
				<text class="profile-label">身份标签</text>
				<view class="profile-value-wrap">
					<text class="profile-value" :class="{ 'profile-value--empty': !identityTag }">
						{{ identityTag || '未设置' }}
					</text>
					<text class="profile-arrow">›</text>
				</view>
			</view>
			<view class="profile-divider"></view>
			<view class="profile-row" @tap="openEditProfile">
				<text class="profile-label">性别</text>
				<view class="profile-value-wrap">
					<text class="profile-value" :class="{ 'profile-value--empty': !gender }">
						{{ gender || '未设置' }}
					</text>
					<text class="profile-arrow">›</text>
				</view>
			</view>
		</view>

		<!-- ====== 绑定管理 ====== -->
		<view class="section-title">伴侣绑定</view>

		<!-- 已绑定的用户 -->
		<view v-if="activeBindings.length" class="card-list">
			<view v-for="b in activeBindings" :key="b.id" class="card bind-card">
				<view class="bind-info">
					<view class="bind-name-row">
						<text class="bind-name">{{ partnerName(b) }}</text>
						<text v-if="partnerGender(b)" class="bind-gender-tag">{{ partnerGender(b) }}</text>
					</view>
					<text class="bind-date">绑定于 {{ formatDate(b.bound_at) }}</text>
				</view>
				<text class="unbind-btn" @tap="handleUnbind(b)">解绑</text>
			</view>
		</view>

		<!-- 待审批的申请（收到的） -->
		<view v-if="incomingRequests.length" class="section-title">收到的申请</view>
		<view v-if="incomingRequests.length" class="card-list">
			<view v-for="b in incomingRequests" :key="b.id" class="card bind-card">
				<view class="bind-info">
					<view class="bind-name-row">
						<text class="bind-name">{{ partnerName(b) }}</text>
						<text v-if="partnerGender(b)" class="bind-gender-tag">{{ partnerGender(b) }}</text>
					</view>
					<text class="bind-date">请求与你绑定</text>
				</view>
				<view class="bind-actions">
					<text class="accept-btn" @tap="handleAccept(b)">同意</text>
				</view>
			</view>
		</view>

		<!-- 已发出的申请 -->
		<view v-if="outgoingRequests.length" class="section-title">发出的申请</view>
		<view v-if="outgoingRequests.length" class="card-list">
			<view v-for="b in outgoingRequests" :key="b.id" class="card bind-card">
				<view class="bind-info">
					<view class="bind-name-row">
						<text class="bind-name">{{ partnerName(b) }}</text>
						<text v-if="partnerGender(b)" class="bind-gender-tag">{{ partnerGender(b) }}</text>
					</view>
					<text class="bind-date">等待对方同意</text>
				</view>
			</view>
		</view>

		<!-- ====== 发起绑定 ====== -->
		<view class="section-title">发起绑定</view>
		<view class="card">
			<view class="apply-row">
				<input
					class="apply-input"
					v-model="targetUserId"
					type="number"
					placeholder="输入对方用户 ID"
				/>
				<text class="apply-btn" @tap="handleApply">发送申请</text>
			</view>
		</view>

		<!-- ====== 退出 ====== -->
		<view class="logout-btn" @tap="handleLogout">
			<text>退出登录</text>
		</view>

		<!-- ====== 编辑资料弹窗 ====== -->
		<view v-if="showEditProfile" class="profile-mask" @tap="closeEditProfile">
			<view class="profile-modal" @tap.stop>
				<text class="modal-title">修改个人资料</text>

				<!-- 身份标签 -->
				<text class="modal-label">身份标签</text>
				<input
					class="modal-input"
					v-model="editIdentityTag"
					placeholder="输入身份标签（可留空）"
					:maxlength="20"
				/>

				<!-- 性别 -->
				<text class="modal-label">性别</text>
				<view class="modal-gender-row">
					<text
						class="gender-tag"
						:class="{ 'gender-tag--active': editGender === '男' }"
						@tap="editGender = editGender === '男' ? '' : '男'"
					>男</text>
					<text
						class="gender-tag"
						:class="{ 'gender-tag--active': editGender === '女' }"
						@tap="editGender = editGender === '女' ? '' : '女'"
					>女</text>
					<text
						class="gender-tag"
						:class="{ 'gender-tag--active': editGender === '' }"
						@tap="editGender = ''"
					>不设置</text>
				</view>

				<!-- 按钮 -->
				<view class="modal-btns">
					<text class="modal-btn modal-btn--cancel" @tap="closeEditProfile">取消</text>
					<text class="modal-btn modal-btn--save" @tap="handleSaveProfile">保存</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { getUser, logout, updateUserFields } from '@/store/auth.js'
import { getTheme } from '@/store/theme.js'
import { getBindings, applyBinding, acceptBinding, unbindBinding } from '@/api/binding.js'
import { updateProfile } from '@/api/auth.js'

export default {
	setup() {
		const isDark = ref(getTheme() === 'dark')
		const user = getUser() || {}
		const userId = user.id || 0
		const userName = user.username || '未登录'
		const userInitial = computed(() => (userName[0] || 'U').toUpperCase())

		/* ---- 身份标签 & 性别（响应式） ---- */
		const identityTag = ref(user.identity_tag || '')
		const gender = ref(user.gender || '')

		/* ---- 编辑弹窗状态 ---- */
		const showEditProfile = ref(false)
		const editIdentityTag = ref('')
		const editGender = ref('')

		function openEditProfile() {
			editIdentityTag.value = identityTag.value
			editGender.value = gender.value
			showEditProfile.value = true
		}

		function closeEditProfile() {
			showEditProfile.value = false
		}

		async function handleSaveProfile() {
			try {
				await updateProfile(userId, {
					identity_tag: editIdentityTag.value.trim(),
					gender: editGender.value
				})
				// 同步本地存储 & 页面状态
				identityTag.value = editIdentityTag.value.trim()
				gender.value = editGender.value
				updateUserFields({
					identity_tag: identityTag.value,
					gender: gender.value
				})
				showEditProfile.value = false
				uni.showToast({ title: '修改成功', icon: 'success' })
			} catch (_) {
				// 错误已在 request 层提示
			}
		}

		const targetUserId = ref('')
		const bindings = ref([])
		const loading = ref(false)

		/* ---- 状态栏 & 胶囊按钮适配（微信 / APK 兼容） ---- */
		const headStyle = computed(() => {
			const sys = uni.getSystemInfoSync()
			const statusBarHeight = sys.statusBarHeight || 0
			try {
				// #ifdef MP-WEIXIN
				const menu = uni.getMenuButtonBoundingClientRect()
				if (menu && menu.bottom) {
					const navHeight = menu.bottom + 8
					const padRight = sys.windowWidth - menu.left + 12
					return {
						paddingTop: statusBarHeight + 'px',
						height: (navHeight - statusBarHeight) + 'px',
						lineHeight: menu.height + 'px',
						paddingLeft: '20px',
						paddingRight: padRight + 'px'
					}
				}
				// #endif
				// APK / H5 回退
				return {
					paddingTop: statusBarHeight + 'px',
					height: '44px',
					lineHeight: '44px',
					paddingLeft: '20px',
					paddingRight: '20px'
				}
			} catch (e) {
				return {
					paddingTop: statusBarHeight + 'px',
					height: '44px',
					lineHeight: '44px',
					paddingLeft: '20px',
					paddingRight: '20px'
				}
			}
		})

		/* ---- 分类绑定列表 ---- */
		const activeBindings = computed(() =>
			bindings.value.filter(b => b.status === 'active')
		)
		const incomingRequests = computed(() =>
			bindings.value.filter(b => b.status === 'pending' && b.role === 'receiver')
		)
		const outgoingRequests = computed(() =>
			bindings.value.filter(b => b.status === 'pending' && b.role === 'requester')
		)

		/* ---- 对方显示名 ---- */
		function partnerName(b) {
			if (b.partner_user) {
				return b.partner_user.username || ('用户' + b.partner_user_id)
			}
			return '用户' + (b.partner_user_id || '?')
		}

		/* ---- 对方性别 ---- */
		function partnerGender(b) {
			return b.partner_user ? (`${b.partner_user.identity_tag} ${b.partner_user.gender}` || '') : ''
		}

		/* ---- 加载绑定列表 ---- */
		async function loadBindings() {
			try {
				const result = await getBindings()
				console.log(result)
				bindings.value = Array.isArray(result?.list) ? result.list : []
			} catch (_) {
				bindings.value = []
			}
		}

		onMounted(loadBindings)

		/* ---- 操作 ---- */
		async function handleApply() {
			const id = parseInt(targetUserId.value)
			if (!id || id === userId) {
				uni.showToast({ title: '请输入有效的用户 ID', icon: 'none' })
				return
			}
			try {
				await applyBinding(id)
				targetUserId.value = ''
				uni.showToast({ title: '申请已发送', icon: 'success' })
				loadBindings()
			} catch (_) {}
		}

		async function handleAccept(b) {
			try {
				await acceptBinding(b.id)
				uni.showToast({ title: '已同意', icon: 'success' })
				loadBindings()
			} catch (_) {}
		}

		async function handleUnbind(b) {
			try {
				await unbindBinding(b.id)
				uni.showToast({ title: '已解绑', icon: 'success' })
				loadBindings()
			} catch (_) {}
		}

		function handleLogout() {
			uni.showModal({
				title: '退出登录',
				content: '确定要退出吗？',
				success(res) {
					if (res.confirm) {
						logout()
						uni.reLaunch({ url: '/pages/login/index' })
					}
				}
			})
		}

		function formatDate(d) {
			if (!d) return ''
			return d.substring(0, 10)
		}

		function goBack() {
			uni.navigateBack()
		}

		return {
			isDark, userId, userName, userInitial,
			identityTag, gender,
			showEditProfile, editIdentityTag, editGender,
			openEditProfile, closeEditProfile, handleSaveProfile,
			targetUserId, activeBindings, incomingRequests, outgoingRequests,
			partnerName, partnerGender,
			headStyle, handleApply, handleAccept, handleUnbind, handleLogout,
			formatDate, goBack
		}
	}
}
</script>

<style lang="scss" scoped>
.user-page {
	background: #fff;
	min-height: 100vh;
	padding-bottom: 60rpx;
}
.user-dark { background: #1c1c1e; }

/* ---- 头部 ---- */
.user-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.head-back {
	font-size: 52rpx;
	font-weight: 200;
	color: #1a1a1a;
	width: 60rpx;
	text-align: center;
}
.user-dark .head-back { color: #e5e5e7; }
.head-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #1a1a1a;
}
.user-dark .head-title { color: #e5e5e7; }
.head-spacer { width: 60rpx; }

/* ---- 用户卡片 ---- */
.card {
	margin: 20rpx 24rpx;
	padding: 28rpx;
	background: #f8f8f8;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
}
.user-dark .card { background: #2c2c2e; }

.avatar {
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #007aff, #5856d6);
	color: #fff;
	font-size: 38rpx;
	font-weight: 700;
	line-height: 88rpx;
	text-align: center;
	flex-shrink: 0;
}
.user-info {
	margin-left: 24rpx;
}
.user-name {
	font-size: 32rpx;
	font-weight: 600;
	color: #1a1a1a;
	display: block;
}
.user-dark .user-name { color: #e5e5e7; }
.user-id {
	font-size: 24rpx;
	color: #999;
	margin-top: 4rpx;
}
.user-dark .user-id { color: #8e8e93; }

/* ---- 分区标题 ---- */
.section-title {
	font-size: 26rpx;
	font-weight: 600;
	color: #999;
	padding: 20rpx 28rpx 8rpx;
}
.user-dark .section-title { color: #8e8e93; }

/* ---- 绑定列表 ---- */
.card-list {
	display: flex;
	flex-direction: column;
}
.bind-card {
	justify-content: space-between;
	margin: 0 24rpx 12rpx;
}
.bind-info {
	flex: 1;
}
.bind-name-row {
	display: flex;
	align-items: center;
	gap: 12rpx;
}
.bind-name {
	font-size: 28rpx;
	color: #1a1a1a;
}
.user-dark .bind-name { color: #e5e5e7; }
.bind-gender-tag {
	font-size: 20rpx;
	color: #007aff;
	background: rgba(0,122,255,.08);
	padding: 2rpx 12rpx;
	border-radius: 16rpx;
}
.user-dark .bind-gender-tag {
	color: #0a84ff;
	background: rgba(10,132,255,.15);
}
.bind-date {
	font-size: 22rpx;
	color: #999;
	margin-top: 4rpx;
	display: block;
}
.user-dark .bind-date { color: #8e8e93; }
.bind-actions {
	display: flex;
	align-items: center;
	flex-shrink: 0;
}

.unbind-btn {
	font-size: 24rpx;
	color: #ff3b30;
	padding: 10rpx 20rpx;
	background: rgba(255,59,48,.08);
	border-radius: 20rpx;
}
.unbind-btn:active { opacity: .6; }
.accept-btn {
	font-size: 24rpx;
	color: #fff;
	background: #007aff;
	padding: 10rpx 24rpx;
	border-radius: 20rpx;
	font-weight: 500;
}
.accept-btn:active { opacity: .75; }

/* ---- 发起绑定 ---- */
.apply-row {
	display: flex;
	align-items: center;
	width: 100%;
}
.apply-input {
	flex: 1;
	height: 76rpx;
	border: 1px solid #eee;
	border-radius: 40rpx;
	padding: 0 28rpx;
	font-size: 26rpx;
	background: #fff;
	color: #1a1a1a;
}
.user-dark .apply-input {
	background: #3a3a3c;
	border-color: #48484a;
	color: #e5e5e7;
}
.apply-btn {
	flex-shrink: 0;
	margin-left: 16rpx;
	padding: 18rpx 32rpx;
	background: #007aff;
	color: #fff;
	border-radius: 40rpx;
	font-size: 26rpx;
	font-weight: 600;
}
.apply-btn:active { opacity: .75; }

.logout-btn {
	margin: 60rpx 24rpx;
	height: 96rpx;
	background: #f8f8f8;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	color: #ff3b30;
	font-weight: 500;
}
.logout-btn:active { opacity: .6; }
.user-dark .logout-btn { background: #2c2c2e; }

/* ---- 用户标签 ---- */
.user-tags {
	display: flex;
	gap: 12rpx;
	margin-top: 10rpx;
}
.user-tag {
	font-size: 22rpx;
	color: #007aff;
	background: rgba(0,122,255,.08);
	padding: 4rpx 16rpx;
	border-radius: 20rpx;
}
.user-dark .user-tag {
	color: #0a84ff;
	background: rgba(10,132,255,.15);
}

/* ---- 个人资料卡片 ---- */
.profile-card {
	flex-direction: column;
	align-items: stretch;
	padding: 0 28rpx;
}
.profile-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 96rpx;
}
.profile-label {
	font-size: 28rpx;
	color: #1a1a1a;
}
.user-dark .profile-label { color: #e5e5e7; }
.profile-value-wrap {
	display: flex;
	align-items: center;
}
.profile-value {
	font-size: 28rpx;
	color: #1a1a1a;
}
.user-dark .profile-value { color: #e5e5e7; }
.profile-value--empty {
	color: #ccc;
}
.user-dark .profile-value--empty { color: #636366; }
.profile-arrow {
	font-size: 36rpx;
	color: #ccc;
	margin-left: 12rpx;
}
.user-dark .profile-arrow { color: #636366; }
.profile-divider {
	height: 1rpx;
	background: #eee;
}
.user-dark .profile-divider { background: #48484a; }

/* ---- 编辑资料弹窗 ---- */
.profile-mask {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0,0,0,.4);
	z-index: 999;
	display: flex;
	align-items: center;
	justify-content: center;
}
.profile-modal {
	width: 600rpx;
	background: #fff;
	border-radius: 24rpx;
	padding: 40rpx 36rpx;
}
.user-dark .profile-modal { background: #2c2c2e; }
.modal-title {
	font-size: 32rpx;
	font-weight: 700;
	color: #1a1a1a;
	text-align: center;
	display: block;
	margin-bottom: 32rpx;
}
.user-dark .modal-title { color: #e5e5e7; }
.modal-label {
	font-size: 26rpx;
	color: #999;
	display: block;
	margin: 20rpx 0 12rpx;
}
.user-dark .modal-label { color: #8e8e93; }
.modal-input {
	height: 88rpx;
	border: 2rpx solid #eee;
	border-radius: 16rpx;
	padding: 0 24rpx;
	font-size: 28rpx;
	background: #f8f8f8;
	color: #1a1a1a;
}
.user-dark .modal-input {
	background: #3a3a3c;
	border-color: #48484a;
	color: #e5e5e7;
}
.modal-gender-row {
	display: flex;
	gap: 16rpx;
	margin-bottom: 8rpx;
}
.modal-gender-row .gender-tag {
	font-size: 26rpx;
	color: #666;
	padding: 14rpx 36rpx;
	border-radius: 40rpx;
	border: 2rpx solid #eee;
	background: #f8f8f8;
}
.user-dark .modal-gender-row .gender-tag {
	color: #c7c7cc;
	border-color: #48484a;
	background: #2c2c2e;
}
.gender-tag--active {
	color: #fff !important;
	background: #007aff !important;
	border-color: #007aff !important;
}
.modal-btns {
	display: flex;
	gap: 20rpx;
	margin-top: 36rpx;
}
.modal-btn {
	flex: 1;
	height: 88rpx;
	border-radius: 44rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 30rpx;
	font-weight: 600;
}
.modal-btn--cancel {
	background: #f8f8f8;
	color: #666;
}
.user-dark .modal-btn--cancel {
	background: #3a3a3c;
	color: #c7c7cc;
}
.modal-btn--save {
	background: #007aff;
	color: #fff;
}
.modal-btn:active { opacity: .75; }
</style>
