/**
 * 认证相关 API
 */
import { post, put, saveToken } from './request.js'

/** 注册（identity_tag 和 gender 可选） */
export function register(username, password, identity_tag, gender) {
	const body = { username, password }
	if (identity_tag) body.identity_tag = identity_tag
	if (gender) body.gender = gender
	return post('/user/register', body, { needAuth: false }).then(data => {
		return data
	})
}

/** 修改用户资料（identity_tag / gender，均可为空表示清除） */
export function updateProfile(userId, data = {}) {
	return put('/user/' + userId, data).then(data => {
		return data
	})
}

/** 登录 */
export function login(username, password) {
	return post('/user/login', { username, password }, { needAuth: false }).then(data => {
		if (data && data.token) {
			saveToken(data.token)
		}
		return data
	})
}

/** 微信一键登录 */
export function wechatLogin() {
	return new Promise((resolve, reject) => {
		uni.login({
			provider: 'weixin',
			success(loginRes) {
				if (!loginRes.code) {
					reject(new Error('获取微信授权码失败'))
					return
				}
				// 用 code 作为凭证登录，后端校验并返回 token
				post('/user/login', {
					username: 'wx_' + loginRes.code,
					password: loginRes.code
				}, { needAuth: false }).then(data => {
					if (data && data.token) {
						saveToken(data.token)
					}
					resolve(data)
				}).catch(reject)
			},
			fail(err) {
				reject(err)
			}
		})
	})
}
