# Calendar — uniapp 小程序项目

基于 uniapp (Vue 3) 的跨端项目，主目标平台为微信小程序，SCSS 预处理。

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | uniapp (Vue 3 + Composition API) |
| 样式 | SCSS，单位 rpx (750rpx = 屏幕宽度) |
| 主平台 | 微信小程序 (mp-weixin)，appid: `wxeb2bad71e027c341` |
| 兼容平台 | H5 / 支付宝 / 百度 / 头条小程序 |
| 开发工具 | HBuilderX |
| 语言 | JavaScript (ES6+)，国际化 zh-Hans |

## 项目结构

```
calendar/
├── pages/
│   ├── index/
│   │   └── index.vue       # 日历主页（月历网格 + 人物色点 + 计数角标）
│   └── statistics/
│       └── index.vue       # 统计页（跨日聚合、人物/类别汇总）
├── components/
│   ├── app-icon/
│   │   └── index.vue       # SVG 图标组件（16 种 Feather 风格图标，替代 emoji）
│   └── date-detail-modal/
│       └── index.vue       # 日期详情弹窗（极简风格 + 人物选择 + 事件管理）
├── store/
│   ├── calendar.js         # 数据层：事件 CRUD + 聚合统计 + 人物支持
│   └── theme.js            # 主题管理：黑夜模式切换 + 持久化
├── static/                 # 静态资源
├── App.vue                 # 应用入口 + 全局 CSS 变量
├── main.js                 # Vue 实例化
├── pages.json              # 页面路由（navigationStyle: custom 自定义导航栏）
├── manifest.json           # 应用配置
└── uni.scss                # SCSS 主题变量（含事件/人物色板）

## 命令

项目通过 HBuilderX 管理，无 package.json：
- **运行到微信小程序**: HBuilderX → 运行 → 运行到小程序模拟器 → 微信开发者工具
- **H5 开发**: HBuilderX → 运行 → 运行到浏览器
- **生产构建**: HBuilderX → 发行 → 小程序-微信

若后续迁移到 CLI，使用 `@dcloudio/uni-cli`。

## 架构

```
App.vue (全局生命周期 + 公共样式)
  └── pages/*.vue (页面级组件，由 pages.json 路由)
        └── components/ (可复用组件，需手动创建目录)
```

- **pages.json** = 路由表 + 全局窗口样式，`pages` 数组首项为首页
- **manifest.json** = 跨平台编译配置，各平台差异化设置在此
- **uni.scss** = 主题变量文件，所有 .scss/.vue 文件中可直接使用其变量，无需显式 import
- 每个页面是一个 .vue 单文件组件，使用 Options API 或 Composition API (`setup`)

## 样式主题 (uni.scss 变量)

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
2. **颜色优先用 uni.scss 变量**，不硬编码色值。如需项目专属色，先扩展到 uni.scss
3. **避免深层选择器嵌套**，最多 3 层；小程序端 `*` 选择器支持有限
4. **字体使用系统默认栈**，不引入外部字体文件（小程序包体积限制）
5. 全局公共样式写在 `App.vue` 的 `<style>` 中（不要 scoped）

### 页面 & 组件规范

1. **页面必须在 pages.json 中注册**，新增页面先在 `pages` 数组中声明 path
2. **页面 = 目录 + index.vue**，如 `pages/order/index.vue`
3. **组件放 `components/` 目录**，命名用 kebab-case 目录 + index.vue：`components/order-card/index.vue`
4. **优先用 Composition API (`setup`)**，保持与 Vue 3 生态一致
5. 页面级数据用 `ref` / `reactive`，跨页面共享状态用 `provide`/`inject` 或独立 store 模块
6. 避免在模板中使用复杂表达式，提取为 computed

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
2. **不支持部分 CSS**：不支持 `position: fixed` 在 scroll-view 内、不支持 ` backdrop-filter`
3. **DOM 操作受限**：不能直接操作 DOM，使用 uni-app API 代替
4. **条件编译**：平台差异化代码用 `#ifdef MP-WEIXIN` / `#ifndef H5` 等预处理指令
5. **API 调用**：优先用 `uni.xxx` API，保证跨平台一致性；微信专有能力用条件编译包裹
6. **网络请求**：小程序需在微信后台配置合法域名，开发阶段可勾选"不校验域名"

### 代码质量

1. 每个 .vue 文件保持职责单一，不超过 300 行
2. 避免在 `data`/`setup` 返回大型闭包对象，提取到模块作用域
3. 事件处理函数命名 `handleXxx` 或 `onXxx`
4. 组件 props 必须有类型声明和默认值
5. **不要修改 uni.scss 中的官方变量名**（它们是 uni-app 生态的约定），可追加自定义变量

## Notes

<!-- 项目特有注意事项，随时补充 -->
- 项目暂未接入任何 CI / 测试框架 / 状态管理库
- appid 已在 manifest.json 中配置，切换环境时注意检查
- **图标系统**: 使用 Remix Icon v4.6.0（`static/fonts/remixicon.woff2`），通过 `components/app-icon` 组件封装，禁止引入 emoji 或自定义 SVG
- **黑夜模式**: 通过 CSS 自定义属性 `var(--bg)` 等实现，主题状态存于 `uni.storage`
- **人物体系**: 事件可标记老公/老婆/共同，计数时同类型+同人物自动累加
- **统计页**: 本周/本月切换，支持按人物和类别二维聚合
