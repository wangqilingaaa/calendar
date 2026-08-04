# 项目长期笔记（calendar 小程序）

## 产品方向
- 用户（晓杰）在考虑给日历小程序加「每日食谱」功能。
- 产品决策倾向：复用现有 Diary 数据模型（date/person/event/remark）+ 日历网格，做「轻量融合型」，而非新建独立模块。
- 交互模型（已确认 v0.2）：先「周计划」规划这周吃什么，实际吃完再「打卡」。核心 UI 是周餐计划视图（7天×餐次网格 + 打卡圆点），而非月历弹窗。
- 数据扩展建议：Diary 加 meal(早/午/晚/加餐) / dish(菜名) / calorie(热量) / done(是否吃完打卡) 字段；AI 语音需识别餐次与打卡意图。
- 现有 `eat` 事件类型只能计数次数，记不了餐次/菜名/热量，是主要改造点。
- 方案文档见 `每日食谱产品方案.md`（2026-08-03 由产品通产出，已到 v0.2）。

## 实际实现（pages/weekly-meal）与方案差异
- 周餐计划页 `pages/weekly-meal/index.vue` 已落地，但**纯前端本地存储**（`uni.storage`，key=周一日期），未对接 Diary API / 后端。
- 前端实际数据结构比方案精简：dish 仅 `{name, done}`，**未含** calorie/person/tag/date 字段；餐次枚举为 breakfast/lunch/dinner/snack。
- 若后端接 Golang：当前前端「整周一块 JSON」结构不利于查询/统计，建议落库时展开为记录粒度（含 Date/Weekday/Meal/Person/Calorie/Done/时间戳）。详见 2026-08-04 日志的 model 提取。

## 用户协作偏好
- 问「做成什么样」类问题时，先看信息架构图 + UI 草图，再细化落地。
- 角色：可切换「产品通」做产品规划/PRD，或技术实现模式做代码。
