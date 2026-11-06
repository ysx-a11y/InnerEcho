# 镜界自白（InnerEcho）- 待办与未来功能扩展规划 (TODO)

本项目是一个表里自白与深度心理学架构的卷宗测试系统。为提升用户的自我探索体验并增加长期活跃度，规划了以下三大高奢复杂功能。

---

## 🌌 1. 【潜意识数据探针 & 全网阴影共鸣光谱】 (数据 Tab 落地)
将底栏中未开放的 `数据` 页面替换为多维度的心理与遥测数据可视化面板。

- [ ] **多维心理雷达图 & 能量波形**
  - 利用诊断数据中的 `dominanceIndex` (支配)、`submissionIndex` (臣服)、`restraintIndex` (克制) 及 `sensoryThreshold` (感官阀值) 绘制霓虹发光的雷达图。
- [ ] **敞开度防御墙 (Openness Index)**
  - 结合用户答题时的退格修改率、犹豫停顿次数等行为遥测指标，生成“社交防御盾牌”可视化。
- [ ] **全网反差力学光谱 (Global Resonance Map)**
  - 后端新增 `/api/stats/global` 接口，脱敏聚合统计全网真实职业与暗面渴望标签的对撞数据。
  - 前端展示“职业反差奇观”（例如：*XX% 的高冷精英内心带有[渴望依赖]阴影*）。
- **参考文件**：
  - 前端路由与入口：[App.tsx](file:///e:/modules/projects/InnerEcho/src/App.tsx)
  - 诊断数据计算器：[calculator.ts](file:///e:/modules/projects/InnerEcho/src/utils/calculator.ts)
  - 后端数据路由：[stats.ts](file:///e:/modules/projects/InnerEcho/server/routes/stats.ts)

---

## 🗝️ 2. 【阴影蜕变实验室 & 日常行为实验任务】 (任务 Tab 落地)
将底栏中未开放的 `任务` 页面替换为长期的心理阴影接纳与每日生活实验打卡系统。

- [ ] **觉醒契约签署 (Shadow Contract)**
  - 用户解锁隐秘渴望标签后，可在带有金沙流光动效的电子契约上进行手写签名确认，开启蜕变路线。
- [ ] **每日微小生活实验 (Daily Micro-Experiments)**
  - 根据用户的阴影标签，每日为其量身定制生活小实验（例如：温和地拒绝一次请求、向信任的人倾诉依赖等）。
- [ ] **心流手记本 (Echo Journaling)**
  - 记录完成任务后的心流手记，手记深度与字数会动态反向修正“心理敞开度”指数。
- **参考文件**：
  - 任务入口与渲染：[App.tsx](file:///e:/modules/projects/InnerEcho/src/App.tsx)
  - 数据库字段保存：[db.ts](file:///e:/modules/projects/InnerEcho/server/db.ts)

---

## 🎨 3. 【绝密卷宗海报 2.0 & 视觉声轨融合导出】 (海报功能升级)
大幅强化 `ResultView` 诊断海报的保存、分享和视听沉浸感。

- [ ] **高精 Canvas 海报导出引擎**
  - 重构前端海报生成逻辑，支持高清晰度卡片海报下载，并适配移动端壁纸比例。
- [ ] **潜意识声轨合成 (Visual-Audio Fusion)**
  - 根据用户的测试指标算法动态合成专属的疗愈背景白噪音，并将声轨集成在卡片中。
- [ ] **多视觉主题切换**
  - 根据 `depthRating`（心理深浅度），解封黑曜金 / 玫瑰金 / 幽冥紫等多配色动态主题。
- **参考文件**：
  - 自白海报视图：[ResultView.tsx](file:///e:/modules/projects/InnerEcho/src/components/ResultView.tsx)
  - 原型数据：[psychologyArchetypes.ts](file:///e:/modules/projects/InnerEcho/src/data/psychologyArchetypes.ts)
