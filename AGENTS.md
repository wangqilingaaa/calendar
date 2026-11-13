# Calendar — uniapp 小程序项目

「王无敌的每日记录」：基于 uniapp (Vue 3) 的情侣/家庭日记日历小程序，主目标平台微信小程序，SCSS 预处理。核心功能：每日事件记录、AI 语音录入、周餐计划、统计与伴侣绑定。

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | uniapp (Vue 3 + Composition API，统一 `<script setup>`) |
| 样式 | SCSS + CSS 变量，单位 rpx (750rpx = 屏幕宽度) |
| 主平台 | 微信小程序 (mp-weixin)，appid: `wx91ec11812be402b2` |
| 兼容平台 | H5 / 支付宝 / 百度 / 头条小程序 |
| 开发工具 | HBuilderX（无 package.json / 无 CLI 构建） |
| 语言 | JavaScript (ES6+)，国际化 zh-Hans |
| 后端 | REST API `http://112.124.7.78:8085`（见 `api/config.js`） |
| 图标 | Remix Icon v4.6.0（`static/fonts/remixicon.woff2`） |
| 语音 | 微信同声传译插件 WechatSI 0.3.5（仅微信小程序支持） |

## 项目结构

```
calendar/
├── pages/
│   ├── login/index.vue          # 登录/注册 + 微信一键登录（未登录时跳转至此）
│   ├── index/index.vue          # 日历主页：月历网格 + 人物色点 + 状态标记 + 计数角标 + AI 录入
│   ├── statistics/index.vue     # 统计页：本周/本月/上个月，人物×类别聚合 + 体重趋势图
│   ├── user/index.vue           # 我的：资料编辑（身份标签/性别）、伴侣绑定、退出登录
│   └── weekly-meal/index.vue    # 本周餐计划：7 天 × 4 餐次 + 原材料清单
├── components/
│   ├── app-icon/index.vue       # Remix Icon 封装（ICON_MAP 映射）
│   ├── date-detail-modal/       # 日期详情弹窗：状态切换 + 事件增删改 + 人物选择 + 运动结构化录入
│   ├── ai-input-modal/          # AI 文字输入、示例提示、解析结果确认
│   ├── meal-detail-modal/       # 某天某餐次的菜单/原材料编辑
│   └── trend-line-chart/        # 纯 view 绘制的折线图（体重趋势）
├── api/
│   ├── config.js                # API_BASE 后端地址
│   ├── request.js               # uni.request 封装：Token 注入、401 处理、业务码校验
│   ├── auth.js                  # 登录/注册/微信登录/修改资料
│   ├── binding.js               # 伴侣绑定：查询/申请/同意/解绑
│   ├── diary.js                 # 日记 CRUD、按天/月查询、状态更新
│   ├── meal-plan.js             # 周计划、食谱条目、原材料
│   └── ai.js                    # 后端 AI 解析/示例生成 + 微信语音识别
├── store/
│   ├── calendar.js              # 事件类型、日期状态、日记 CRUD 封装、按月查询、统计聚合
│   ├── persons.js               # 动态人物列表（自己 + 绑定用户 + 共同）与人物 id 归一化
│   ├── auth.js                  # 用户信息与登录态（storage 持久化）
│   ├── theme.js                 # 黑夜模式切换（storage key: app_theme）
│   └── profile-theme.js         # 按用户性别返回资料主题类
├── data/
│   └── gym-actions.json         # 健身房动作库（联想列表 + 常用动作）
├── scripts/
│   └── release-h5.sh            # H5 发版：构建/上传/备份/切换/健康检查
├── static/fonts/                # remixicon.css + woff2 字体
├── App.vue                      # 启动登录检查 + 全局 CSS 变量与主题类
├── main.js                      # Vue 实例化
├── pages.json                   # 页面路由（首项为 login，其余页面 custom 导航栏）
├── manifest.json                # 应用配置与版本号（versionName 1.2.1）
└── uni.scss                     # SCSS 变量（uni 官方 + 日历自定义）
```

## 命令

项目通过 HBuilderX 管理，无 package.json：
- **运行到微信小程序**: HBuilderX → 运行 → 运行到小程序模拟器 → 微信开发者工具
- **H5 开发**: HBuilderX → 运行 → 运行到浏览器
- **生产构建**: HBuilderX → 发行 → 小程序-微信

若后续迁移到 CLI，使用 `@dcloudio/uni-cli`。

## 发版（H5）

H5 站点部署在服务器 `/var/www/calendar`，由 nginx `calendar-923.conf` 监听 923 端口：

- 访问地址：`http://112.124.7.78:923/`
- 发版命令：`scripts/release-h5.sh`
  - `--dry-run`：只构建/上传/解压校验，不改线上目录
  - `--skip-build`：跳过构建，发布现有 `unpackage/dist/build/web`
- 脚本使用 HBuilderX 内置 uni-app 编译器无界面构建 H5，经 workbench CLI 上传，备份线上目录到 `/var/www/calendar.bak-<时间戳>` 后原子切换，并做 HTTP 200 健康检查
- app 端（Android/iOS）与小程序由开发者自行打包，不走该脚本

## 架构

```
App.vue (onLaunch 检查登录态)
  └── pages/*.vue (页面，pages.json 路由)
        ├── components/ (可复用弹窗 / 图表 / 图标)
        └── store/ (业务状态与数据聚合) → api/ (HTTP)
```

- 所有业务数据走后端 API，前端不缓存日记数据；日期状态也由后端持久化（`putDiaryStatus`）
- `api/request.js`：后端统一响应 `{ code, message, data }`，`code !== 0` 视为业务错误；HTTP/业务码 401 时清理 Token 并 reLaunch 登录页
- `App.vue` 的 `onLaunch` 检查 token，未登录直接 reLaunch 到 `pages/login/index`
- 页面通过 `@dcloudio/uni-app` 的 `onShow` 刷新数据，保证登录态、人物列表、资料主题变化后返回时同步

## 数据模型

- **Diary**: `{ ID, date: 'YYYY-MM-DD', person, event(类型中文名), event_remark, attachments, CreatedAt }`
- **事件类型** `EVENT_TYPES`（store/calendar.js）：water/eat/exercise/medicine/weight/study 可计数；anniversary/task/custom 不可计数
- **日期状态** `DATE_STATUSES`：normal / holiday / busy / important
- **人物**：
  - 前端主键统一为数据库 `user.id`，"共同"固定为 `both`
  - 动态人物列表 = 自己 + 状态为 active 的绑定用户 + 共同（store/persons.js，按 id 去重）
  - `normalizePersonId` 兼容历史值（identity_tag / username / husband / wife / 名称）；`toPersonPayload` 转为接口提交值
- **体重**：从 `weight` 事件的备注中解析 20–300 区间的数值，统计页按人物生成趋势点
- **运动（健身房）**：日期弹窗选中「运动」时切换为健身房记录表单（动作联想输入 + 组数/次数/重量 + 备注），提交时拼接为 `动作 · N组×M次 · 重量kg · 备注`（重量、备注选填）写入 `event_remark`，后端仍只存这一个文本字段；动作联想库维护在 `data/gym-actions.json`
- **事件编辑**：调用 `PUT /diary/{id}` 部分更新（未传字段保持原值），弹窗编辑态可修改日期（支持跨天）/人物/类型/备注；不传 `attachments` 以保留原附件，`CreatedAt` 保持不变

## 样式主题

### 三层主题机制

1. **基础/黑夜**：`App.vue` 中 `page` 上定义 CSS 变量（`--bg`、`--text-primary`、`--card-bg` 等）；黑夜模式由页面根节点的 `.theme-dark` / `*-dark` 类覆盖
2. **资料主题**：`theme-male` / `theme-female` / `theme-neutral`，由用户 `gender` 决定（store/profile-theme.js），页面根节点动态绑定
3. **SCSS 变量**：`uni.scss` 保留 uni 官方变量 + 日历自定义变量（事件色、人物色、状态色）

### 颜色体系
- 主色 `$uni-color-primary: #007aff`
- 成功 `$uni-color-success: #4cd964`
- 警告 `$uni-color-warning: #f0ad4e`
- 危险 `$uni-color-error: #dd524d`

### 文字颜色
- 正文 `$uni-text-color: #333`
- 反色 `$uni-text-color-inverse: #fff`
- 辅助灰 `$uni-text-color-grey: #999`
- 占位 `$uni-text-color-placeholder: #808080`
- 禁用 `$uni-text-color-disable: #c0c0c0`

### 背景颜色
- 白底 `$uni-bg-color: #fff`
- 灰底 `$uni-bg-color-grey: #f8f8f8`
- 点击态 `$uni-bg-color-hover: #f1f1f1`
- 遮罩 `$uni-bg-color-mask: rgba(0,0,0,0.4)`

### 尺寸 & 间距
- 字号: sm=12px, base=14px, lg=16px
- 圆角: sm=2px, base=3px, lg=6px, circle=50%
- 水平间距: sm=5px, base=10px, lg=15px
- 垂直间距: sm=4px, base=8px, lg=12px

## 开发规范

### 样式规范

1. **单位优先用 rpx**，750rpx = 屏幕宽度，适配不同尺寸屏幕。仅在边框等需固定像素的场景用 px
2. **颜色优先用 CSS 变量**（`var(--theme-primary)`、`var(--text-primary)` 等）和 `uni.scss` 变量，不硬编码色值
3. **避免深层选择器嵌套**，最多 3 层；小程序端 `*` 选择器支持有限
4. **字体使用系统默认栈**，不引入外部字体文件（小程序包体积限制；remixicon 是图标字体，属例外）
5. 全局公共样式写在 `App.vue` 的 `<style>` 中（不要 scoped）

### 页面 & 组件规范

1. **页面必须在 pages.json 中注册**，新增页面先在 `pages` 数组中声明 path
2. **页面 = 目录 + index.vue**，如 `pages/order/index.vue`
3. **组件放 `components/` 目录**，命名用 kebab-case 目录 + index.vue：`components/order-card/index.vue`
4. **统一使用 `<script setup>`**；页面生命周期（onShow 等）从 `@dcloudio/uni-app` 引入
5. 跨页面共享状态放 `store/`（普通 ES 模块，非 Pinia），页面级数据用 `ref` / `reactive`
6. 避免在模板中使用复杂表达式，提取为 computed
7. 单文件尽量保持职责单一；当前页面上限已到 ~1100 行，新增复杂 UI 优先拆到 `components/` 或 `store/`

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 页面目录 | kebab-case | `pages/user-center/` |
| 组件目录 | kebab-case | `components/date-picker/` |
| Vue 文件 | index.vue (目录下唯一) | `pages/index/index.vue` |
| CSS 类名 | kebab-case | `.order-card__title` |
| JS 变量/函数 | camelCase | `userInfo`, `getOrderList` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 静态资源 | kebab-case | `icon-close.png` |

### 小程序特有约束

1. **包体积限制**：单包 ≤ 2MB，总包 ≤ 20MB，避免大图片和冗余依赖
2. **不支持部分 CSS**：不支持 `position: fixed` 在 scroll-view 内、不支持 `backdrop-filter`
3. **DOM 操作受限**：不能直接操作 DOM，使用 uni-app API 代替
4. **条件编译**：平台差异化代码用 `#ifdef MP-WEIXIN` / `#ifndef H5` 等预处理指令
5. **API 调用**：优先用 `uni.xxx` API，保证跨平台一致性；微信专有能力（语音识别、微信登录）用条件编译包裹
6. **网络请求**：小程序需在微信后台配置合法域名，开发阶段可勾选"不校验域名"

### 代码质量

1. 每个 .vue 文件职责单一，复杂逻辑优先下沉到 `store/` 或独立组件
2. 避免在 `setup` 中返回大型闭包对象，提取到模块作用域
3. 事件处理函数命名 `handleXxx` 或 `onXxx`
4. 组件 props 必须有类型声明和默认值
5. **不要修改 uni.scss 中的官方变量名**（它们是 uni-app 生态的约定），可追加自定义变量

## Notes

- 项目暂未接入任何 CI / 测试框架 / 状态管理库
- **版本号**: `manifest.json` 的 `versionName` / `versionCode`，发版前同步更新
- **appid**: 微信小程序 appid 为 `wx91ec11812be402b2`，已配置在 manifest.json，切换环境时注意检查
- **后端地址**: 统一在 `api/config.js` 修改 `API_BASE`（当前为生产 IP），本地开发改用注释中的地址
- **图标系统**: 使用 Remix Icon v4.6.0，通过 `components/app-icon` 组件封装（`ICON_MAP` 映射），禁止引入 emoji 或自定义 SVG；新增图标先在 ICON_MAP 中注册
- **黑夜模式**: 通过 CSS 自定义属性 `var(--bg)` 等实现，主题状态存于 `uni.storage`（`app_theme`），未手动选择时跟随系统
- **资料主题**: 按用户性别（男/女/未设置）切换 `theme-male` / `theme-female` / `theme-neutral`，页面 `onShow` 时重新读取
- **人物体系**: 前端主键统一为数据库 `user.id`；"共同"固定 `both`；绑定关系仅 `active` 状态进入人物列表；展示优先使用 `identity_tag`
- **AI 能力**: 前端不直连大模型，统一走后端 `/ai/diary/parse` 与 `/ai/diary/tips`；语音识别仅微信小程序可用
- **登录**: 支持账号密码登录/注册（注册时可选身份标签、性别）与微信一键登录；401 自动清理登录态并跳转登录页
- **周餐计划**: `week_start_date` 必须为周一日期（`YYYY-MM-DD`）；该周未创建时接口返回 `exists=false` 与空 7 天结构
