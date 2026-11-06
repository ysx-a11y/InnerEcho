# InnerEcho 变更记录

> 说明：本记录保留早期开发历史，其中提到的部分内部运维文档、部署脚本与本机路径未随本仓库发布。

## 2026-10-09（LLM 明显异常返回的重试与反馈闭环）

### 新增
- **LLM 明显异常结果识别（`shared/llmAnalysisQuality.ts`，前后端共用）**：只把「确实错了」的返回判定为异常——四维指标（支配 / 臣服 / 克制 / 感官）全部为 0 的「0000」型默认值，或三段解读正文（人格面具 / 潜意识阴影 / 升华建议）全部为空。正常但文风平庸、仅个别指标为 0 的输出一律视为合格，不触发重试，避免把一次合格的生成反复丢弃。
- **服务端自动重试一次**：`callLlm` 解析出上述异常结果时，会附上一段「必须给出真实数值与完整正文」的纠正说明重试一次；两次仍是异常则返回 `degenerate: true` 的失败，交由上层走兜底。
- **用户自助手动重试一次（`POST /api/dossiers/:id/reanalyze`）**：只在 `analyze-dossier` 已标记 `llmFailed`（LLM 侧失败，而非可信度不足的合规兜底）时开放；仅卷宗归属者本人（登录账号，或同设备且未绑定账号的匿名卷宗）可调用，按 IP 限流，重跑成功则原地覆盖诊断结果、不新增卷宗，重跑仍失败则保留原诊断结果不做覆盖。
- **结果页重试提示条（`src/components/LlmRetryNotice.tsx`）**：新装生成的报告命中 `llmFailed`、或从历史恢复的报告被同一口径判定为异常时，展示提示与「重新生成一次」按钮（仅一次）；手动重试仍失败后改为「反馈此问题」，直接打开暗室信箱并预选「异常反馈」分类。

### 变更
- `AnalyzeDossierResponse` 新增 `llmFailed` 字段，用于把「LLM 失败/返回异常」与「可信度不足的合规兜底」区分开：前者开放重试入口，后者不提示重试。
- `WhisperMailboxModal` 新增可选 `initialCategory`，由异常提示进入时预选「异常反馈」。
- **部署 purge 收窄为「只清 InnerEcho 入口文件」**：`scripts/deploy-innerecho.ps1` 不再整区 `purge_everything`，改为 `files` 只清首页/`index.html`/`sw.js`/`robots.txt`/`sitemap.xml` 与管理端首页 6 个固定 URL。原因是本 CF 区域与 Mobile-Tavern 共用，整区清理会把宣传页与 `/downloads/*.apk`（18.9MB/个）的边缘缓存一起刷掉、迫使下一次下载回源。前端资源为内容哈希命名、文章页等实测不缓存，本就无需 purge。实测同一调用的 scoped purge 后 APK 在 DUB 节点 `age` 继续自然增长（未被重置），首页 `MISS→HIT`。
- **nginx 访问日志补耗时字段**：`innerecho_realip` 末尾追加 `$request_time $upstream_response_time`（改前备份 `/root/xui.conf.bak-20261009-logtime`，`nginx -t` 通过后 reload），之后可直接从 `innerecho-access.log` 复盘每次请求的源站耗时。
- **purge 收窄与日志耗时字段已上线**（本次部署，总耗时 02:09）：服务器端 `__DEPLOY_DONE_0`，pm2 三进程 online；purge 步骤输出「已清理 6 个入口 URL」（不再整区清理）；冒烟 robots/首页/管理页 200、用户端口管理 API 404、无令牌 verify 401；线上首页引用 `assets/main-CVEPY1YH.js` 与本地构建一致。新日志格式已在真实流量生效（如 `... "-" 0.022 0.024`）。APK 缓存经实测确认未被触碰：部署前后同一对象在 DUB/MIA/NRT/ATL 的 `age` 连续递增（278–707s），且 `apk-download.log` 部署期间无新增回源。
- 冒烟第 2 次请求返回 `MISS` 属 CF 按节点命中差异（换到了另一个边缘节点），非部署异常，见 §31 口径提醒。

### 验证
- `npm run typecheck` 通过；`npm test` 381 用例全绿（69 个测试文件，含新增 `llmDegenerate.test.ts` 5 例、`llm.test.ts` 异常默认值重试 2 例、`analyzeService.test.ts` llmFailed 标记 2 例、`api.integration.test.ts` 用户自助重跑既有卷宗 1 例）。
- `npm run build` 用户端 / 管理端 / 服务端三份产物构建成功。

### 上线结果（2026-10-09 执行）
- 提交 `9e40dca`；`scripts/deploy-innerecho.ps1` 全流程通过（总耗时 05:13）：服务器端 `__DEPLOY_DONE_0`，pm2 三个进程（user / admin / tgchannel）重启后 online，CF 缓存已清理。
- 冒烟验证：`/robots.txt` 与用户端首页 HTTP 200、用户端口 `/api/admin/verify` 保持 404、管理端首页 200、管理端无 token 访问 `/api/admin/verify` 返回 401。
- 新逻辑线上核对：线上首页引用的 `assets/main-CVEPY1YH.js` 与本地构建一致，且该分片内含「重新生成一次 / 反馈此问题 / 异常反馈」等新增文案；新接口实测 `POST /api/dossiers/:id/reanalyze` 无设备标识 400（缺少设备标识）、带设备标识访问不存在卷宗 404（卷宗未找到或无权操作）。
- 冒烟偏差已修复：本次冒烟 `cf-cache-status` 为 `DYNAMIC`（历史为 MISS→HIT），排查发现首页 HTML 边缘缓存规则在 10-08 整理 APK 缓存时被清掉。已重建「InnerEcho HTML shell edge cache 60min」规则并 purge 验证：首页 MISS→HIT、`age` 递增，静态资源与管理端缓存状态不变。详见 `内部运维备忘（未随仓库发布）` §30。

## 2026-10-07（常态绝缘 18 问题库、题库门禁简化、答题页沉浸式进度栏）

### 新增
- **《常态绝缘：温存冷感与折辱沉沦实录》（`normal_insulation_18`）**：18 题深度自白卷宗，14 道单选 + 4 道开放手写（第 5 / 10 / 15 / 18 题，按四幕梯级穿插，避免填空题全堆末尾），覆盖常态排异度、神经劫持度、器物化渴求、灵肉撕扯度、沉沦认命感五个维度。每幕单选均设 0 分档正常对照选项（第 7 / 9 / 13 / 14 / 16 / 17 题），保留「拒绝暴力虐待 / 坚守人格平等 / 现实生活严密隔离 / 清醒反 PUA」的健康作答路径。
- **开放手写题支持多媒体附件**：`QuestionCardRenderer` 在 `open_text` 分支按 `mediaConfig` 渲染上传器，文字或附件任一存在即视为已作答（第 15 题封存意象照片、第 18 题录制备忘语音，单件 20MB）。
- **入口返回链路闭环**：综合入口 → 表里假面档案 → 返回综合入口；题库列表 → 表里假面档案 → 返回题库列表；个人中心入口直达个人中心。

### 变更
- **题库列表取消「基础信息」锁定**：点击任意题库卡片直接极速开测，署名 / 性别 / 年龄缺失时由极速身份门禁补齐（与密封门禁同口径，署名仍必填）；「基础信息」卡片改名为「表里假面档案」，已建档用户点击即进入修改，未建档用户提示可先录入也可直接开测。
- **题库分类定为「真实自白」**：`normal_insulation_18` 的 `category` 取值由 `confession` 改为 `direct`，题库列表归入「真实自白」页签（原先会被既有别名映射落到「心相镜像」页签），管理端提示词模板也可按「真实自白」分类绑定专属模板。
- **管理端补齐新题库**：服务端 `PRESET_BANKS` 登记 `normal_insulation_18`，管理端「题库管理」可列出并预览其 18 题与五维度；管理端遥测的题面文案改为按遥测中实际出现的题库 id 懒加载补齐，不再只认三套历史题库（新题库此前会退化成 `题目 ni_q1` 这类裸 ID）。
- 第一阶段标题改为「表里假面档案 · 表里设定」，按钮文案由「返回首页」改为「返回」。
- 答题页顶部进度栏抽为 `.quiz-sticky-header` 并常驻吸顶（移动端 top / 内边距单独适配）。
- 题库展示排序新增 `normal_insulation_18`（rank 35，排在乖乖女失格之后、心相镜像之前）。
- **首页推荐位换血**：第二层运营精选下架《世交哥哥的私宅与试衣间 · 乖乖女失格日常》（`good_girl_fall_20`），第二推荐位改为《恋爱冷感与纯粹折辱沉沦：《常态绝缘》》（`normal_insulation_18`，标签「温存厌恶 · 18题」，副标题「听不进半句情话，却在被撕碎体面、剥夺意志的快感里彻底清醒」）。首页精选顺序现为「人妻 → 常态绝缘 → 社死极刑」，三张卡片数量不变；`good_girl_fall_20` 题库本身仍保留在题库列表中可正常作答。

### 清理
- 删除 5 个一次性数据核查脚本（`scripts/check-plaintext.ts`、`comprehensive-data-analysis.ts`、`deep-analyze-snapshot.ts`、`inspect-snapshot.ts`、`test-decrypt.ts`）；均为 10-06 可信度回填期间的临时工具，未纳入版本控制，删除后不可从 Git 恢复。`data-snapshots/` 下的数据库快照保留未动。

### 修复
- **`animate-fade-in` 污染 `position: fixed` 包含块**：关键帧终点由 `translateY(0)` 改为 `none`——`forwards` 会永久保留 transform，祖先元素因此成为 fixed 定位的包含块（暗室信箱胶囊悬浮失效即此因）。同一根因也影响答题页内新增的多媒体上传器。
- **`normalInsulation18Bank.test.ts` 缺少 `SingleQuestionLog` 必填字段**（`enterTimestamp` / `interactionCount` / `actionLogs` / `isLeftBlank`）导致 `npm run typecheck` 直接失败。

### 验证
- `npm run typecheck` 通过；`npm test` 371 用例全绿（68 个测试文件，含新增 `normalInsulation18Bank.test.ts` 6 例：元数据与注册表一致性、18 题 ID 唯一性与题型分布、第 15/18 题 mediaConfig、正常对照选项 0 分档、懒加载、跨维度计分聚合），并新增管理端断言：`/api/admin/banks` 必须包含 `normal_insulation_18`（内置、已发布、分类真实自白、18 题），防止题库与预设列表再次脱节。
- `npm run build` 用户端 / 管理端 / 服务端三份产物构建成功。

### 上线结果（2026-10-07 执行）
- 首次上线：`scripts/deploy-innerecho.ps1` 全流程通过（总耗时 06:02）：服务器端 `__DEPLOY_DONE_0`，pm2 三个进程（user / admin / tgchannel）重启后 online，CF 缓存已清理。
- 冒烟验证：用户端首页 HTTP 200（首次 MISS → 再次 HIT）、管理端首页 HTTP 200、用户端口 `/api/admin/verify` 保持 404、管理端无 token 访问 `/api/admin/verify` 返回 401。
- 新题库产物核对：线上 `index.html` 引用的 `assets/main-DdMeVRlo.js` 与本地构建一致，`normalInsulation18Bank`、`BankSelectorView` 分片均返回 200。
- 分类调整与管理端补齐后二次上线（总耗时 01:57，服务器端同样 `__DEPLOY_DONE_0`）：线上首页引用 `assets/main-Pdm708qx.js` 与本地构建一致；用户端与管理端均可取到 `normalInsulation18Bank` 新分片（HTTP 200）；服务器 `/var/www/innerecho/dist-server/server/data/` 下预置文件增至 7 个，`presetBanks.js` 已引用 `normal_insulation_18`，其分类为 `direct`。
- 首页推荐位换血上线（总耗时 06:01，服务器端 `__DEPLOY_DONE_0`）：pm2 三进程（user / admin / tgchannel）online；线上入口 `assets/main-CzW_bkuA.js`、首页分片 `assets/PortalView-wgii5Wro.js` 与本地构建一致，其中《常态绝缘》新卡片文案齐全、已无「假面崩塌 / 乖乖女失格日常」；`goodGirlFall20Bank` / `normalInsulation18Bank` / `BankSelectorView` 分片均 HTTP 200（题库列表仍可正常进入乖乖女卷宗）。CF purge 后首页第 1 次 MISS、第 2 次 HIT，管理端首页 200。

## 2026-10-06（暗室信箱、可信度评估重构、地区统计自洽、存量回填）

### 新增
- **暗室信箱（1v1 私密投递）**：用户端新增常驻「暗室信箱」胶囊入口，可向主理人投递体验建议 / 自白心声 / 题库灵感 / 异常反馈，可留联系方式；未登录也可投递，按设备 15 分钟 10 次限流。管理端新增「暗室信箱」工作台，支持按待回复 / 已回复筛选、逐条私密回信与删除，导航带待回复角标。
- **匿名与账号的口径隔离**：匿名请求只读取未绑定账号（`user_id IS NULL`）的密信，账号名下的密信与管理端回信必须登录后才可见。口径与卷宗一致（见 `内部运维备忘（未随仓库发布）` §28），避免共享设备登出后把上一位账号持有者的私信回传给下一位访客。
- 数据库迁移 v33 新建 `whisper_messages` 表（软删除 `deleted_at`、未读标记 `user_has_read_reply`，按 device / user / created_at 建索引）。

### 修复
- **暗室信箱胶囊没有真正悬浮**：胶囊原本渲染在 `PortalView` 根节点内，而该节点带 `.animate-fade-in`——`fadeIn` 关键帧终点是 `transform: translateY(0)`，配合 `forwards` 会把 transform 永久留在元素上；祖先只要有一个非 `none` 的 transform 就会成为 `position: fixed` 的包含块，胶囊于是相对容器定位、随内容一起滚动。现改为 `createPortal` 挂到 `document.body` 彻底脱离该上下文。同时把未读红点移出按钮：新的胶囊样式为裁切流光动效设了 `overflow: hidden`，红点留在按钮内会被圆角和裁切吃掉而看不见。
- **单题停留时长被重复累加**：`questionTelemetryTracker.finishQuestion` 没有幂等判断，而 `startQuestion` 在每次作答交互时都会被调用、`handleSubmitAll` 又会对着全部题目再结算一遍，导致同一题被反复累加 `now - enterTimestamp`；重新进入已结算的题目时也不重置计时起点。症状是"单题停留合计远大于整场作答耗时"（实测某卷宗两题相加 54 分钟、整场仅 23 分 49 秒）。现在显式记录计时中的题目、重开计时窗口，一次进入只结算一次。
- **选项单调性因子形同虚设**：旧实现按"选项 id 是否重复"统计直线作答，而题库选项 id 全局唯一（`mi_q1_a`、`mi_q2_c`…），该因子对所有真实作答恒为满分（占权重 25%）。现改为按「选项位次」统计，并对照随机期望值判断集中程度。
- **无作答轨迹的提交被默认判为可信**：旧实现在 `questionLogs` 为空时直接返回 `90 / high`，等于对"没有证据"发放最高信用。现在返回 `40 / low` 并注明"无法核验"，同时不再调用 LLM、直接落库兜底报告。
- **访客地区分布看不到大部分访问**：卡片按 `region_code` 分组，而海外/代理出口、内网与解析失败的访问都写成空串被过滤掉，于是"99 次访问只显示 4 个地区共 12 次"，百分比还按缩水后的分母算。线上实测当天 48 次埋点里 41 次的访客 IP 在海外（`38.127.x`、`51.89.x`、`141.95.x` 等），且都是真实浏览器会话（`/api/auth/me`、`/api/dossiers`、`/sw.js`），不是爬虫——IP 链路自 10-05 修复后是正常的，问题在统计口径。现在海外记为 `OVERSEAS` 哨兵值、无法归属的访问补一行「未识别地区」，卡片合计与访问量对齐（与旁边「流量来源」卡片的"直接访问 / 无来源"口径一致）。

### 变更
- **可信度改为六因子加权**：作答节奏（整场耗时 ÷ 作答题数，取代易受切题影响的单题停留均值）、完成度、节奏方差、选项分布、写作痕迹、交卷自洽性；样本不足的因子会从加权中剔除并重新归一化，避免用缺失数据惩罚受访者。
- **新增写作痕迹因子（权重最高）**：按「字数 ÷ 操作数」识别整段粘贴——逐字输入约 1-2 字/次操作，整段粘贴为几十上百字/次操作；并叠加"长文本零修改率"辅助判断。
- **新增交卷自洽性因子**：单题停留合计不应超过整场作答时长，超出即标记时间口径矛盾（旧卷宗可能源于上述采集缺陷，提示需人工判断）。
- **关键异常设置封顶**：整段粘贴或极端直线作答 ≤ 45，留白 > 40% ≤ 55，留白 > 70% ≤ 30，无轨迹 40。封顶 45 不会跌破 LLM 分析门禁阈值，避免粘贴类作答被降级为兜底报告。
- 分析结果新增内部字段 `credibilityReasons`（判定依据，仅内部/管理端可见），随 `diagnostic_result_json` 落库。
- **管理端卷宗详情展示判定依据**：「行为遥测与可信度」卡片新增「判定依据」列表，直接列出分数是怎么来的（如"选项位次过于集中（同一位置占比 100%，连续同位置最长 20 题）"）；旧卷宗无该字段时提示可在控制中心重新诊断生成。
- **新增存量卷宗可信度回填工具**（`server/cli/recomputeCredibility.ts`，不调用 LLM）：只读回已落库的作答轨迹重算 `credibilityScore/Level/Reasons` 并合并回诊断 JSON，报告正文与其余字段原样保留；缺少作答轨迹的老卷宗一律跳过并保持原值。默认预演（只统计不写库），`--apply` 时先用 SQLite `VACUUM INTO` 做一致性快照再写；同一数据库行重建映射（`server/services/dossierPayload.ts`）与管理端「重新运行 LLM 深度诊断」共用，避免两处口径漂移。

### 验证
- typecheck 通过；`npm test` 365 用例全绿（新增 `server/utils/credibility.test.ts` 8 例、`server/utils/ipRegion.test.ts` 4 例、`server/db/repositories/regionDistribution.test.ts` 3 例、`server/services/credibilityBackfill.test.ts` 4 例、`server/services/analyzeService.test.ts` 2 例、`server/mailbox.test.ts` 3 例）；`npm run build` 双端产物构建成功。
- 同口径对照（旧 → 新）：直线作答 98 → 45；整段粘贴 98 → 45；留白 70% 78 → 30；无作答轨迹 90(high) → 40(low)；逐字手写的真实卷宗维持 high（旧采集口径的卷宗 91，并附带时间口径提示）。
- 回填工具端到端实测（临时库）：预演 2 条卷宗 → 1 条可重算判为 45/low、1 条无轨迹跳过；`--apply` 自动生成快照并写回 1 条；重复执行变化数 0（幂等）；写回后报告正文（`personaDeconstruction` 等）与 `archetypeTitle` 原样保留。

### 说明
- 已落库的历史卷宗保留原分数，只有管理端「重新运行 LLM 深度诊断」才会按新算法重算。

### 生产回填结果（2026-10-06 执行）
- 线上 268 条卷宗全部重算并写回：high 240 / medium 7 / low 21（写回前已用 `VACUUM INTO` 生成快照 `server/data/database.sqlite.backup-2026-10-06T06-49-21-150Z`，权限 600）。
- 阈值按线上真实分布标定：`dominantShare` p50/p75/p90/p95 = 0.47/0.60/0.80/0.97，`longestRun` = 4/6/10/24，因此直线作答只抓长尾（极端档要求占比 ≥85% 且连续 ≥8 题）。首版阈值会命中 58% 的正常作答，已作废。
- 时间口径缺陷（旧采集导致单题时长中位数被放大 14 倍，268/268 命中）改为只提示、不计分——它不携带任何受访者行为信息。
- 21 条 low 经人工核对确属敷衍作答：20-50 题连续点同一位置（最长连续 36 题）或整段粘贴 250 字；报告正文与原型称号原样保留，仅可信度字段被替换。

## 2026-10-05（题库完成标记与复测对比）

### 新增
- **题库完成标记对访客开放**：新增公开接口 `GET /api/banks/completion`，登录用户按账号聚合、匿名访客按设备标识聚合（只统计 `user_id IS NULL` 的匿名卷宗）。题库卡片明确显示「已完成 / 已完成 · N 次 / 未完成」，游客不再只能看到空白状态。
- **复测对比（仅登录用户）**：新增 `GET /api/dossiers/retest/:bankId`，返回本人同一题库的作答指标序列；题库卡片在作答 ≥2 次的题库上出现「复测对比」入口，弹窗按「首次 → 最近一次」呈现称号、副标题、深度等级、反差张力与四维指数差值、阴影标签新增/移除。只返回指标数值，不返回报告正文、私密原文与内部可信度。

### 变更
- **完成状态的来源改为服务端聚合**：题库完成次数由 `/api/banks/completion` 提供（原实现只依赖登录态下的 `/api/dossiers`），游客与登录用户共用同一套口径；当前会话刚生成、服务端计数尚未返回的那一份由本地按卷宗 ID 去重后补 1。
- **游客不再渲染点不动的入口**：`查看上次报告`、`复测对比` 仅在登录态下渲染；游客侧只保留「已完成 / 未完成」标记（此前游客若被标记为已完成，会出现点击无响应的报告入口）。

### 验证
- typecheck 通过；`npm test` 336 用例全绿（新增 `server/retestComparison.test.ts` 6 例、`src/components/RetestComparisonModal.test.tsx` 3 例、BankSelectorView 2 例）；`npm run build` 双端产物构建成功。
- 本地真实进程冒烟（独立临时库）：`/` 200、`/api/banks/completion` 200、未登录 `/api/dossiers/retest/:bankId` 401。

### 部署
- 2026-10-05 通过 `scripts/deploy-innerecho.ps1` 发布（部署脚本在线备份 DB，无数据库迁移，`PRAGMA user_version` 仍为 32）；pm2 `innerecho-user` / `innerecho-admin` / `innerecho-tgchannel` 三进程 online，无重启；CF purge 后用户端 MISS→HIT、管理端 200。
- 生产实测：匿名设备（`dev_375fd112fb61`）`/api/banks/completion` 返回其 3 个题库及次数（`standard_bdsm_50` 计数 2）；已绑定账号的设备（`dev_ccbde0e4cf8e`）与无设备标识请求均返回空列表，确认匿名口径不会回传账号卷宗；未登录访问复测接口 401；用户端产物已包含 `RetestComparisonModal-*.js` 且 `dist-user` 内无管理端资源。

## 2026-10-04（卷宗署名门禁）

### 修复
- **卷宗必须带署名**：极速开测登记新增必填昵称（回填已有署名），密封门禁不再用「匿名倾诉者」占位兜底，「跳过补充」也需先有合法昵称；服务端 `/api/analyze-dossier` 同步拒绝无合法昵称的提交（400，issue 路径 `dossierData.chapter1.nickname`），管理端不再出现无法分辨的匿名卷宗。

### 验证
- typecheck 通过；`npm test` 328 用例全绿；生产实测无昵称提交 400 且不入库、带合法昵称提交 200 落库（探针记录已清理）。

## 2026-08-29（测试输出静默化）

### 新增
- **测试输出静默化**：`npm test` 默认只输出失败与汇总（`scripts/vitest-quiet-reporter.mjs`，非 TTY 生效、交互终端不变），新增 `npm run test:verbose` 查看完整进度；不引入新的提交门禁。

### 验证
- `npm test` 全量通过；typecheck 通过。

## 2026-08-20（安全边界与维护性整改）

### 修复
- **低负担请求防护**：全局 API 限流提前到请求体解析之前；普通 JSON/表单上限收紧为 2MB，只有卷宗分析与任务媒体提交保留 60MB，海报下载沿用独立 16MB 上限。登录/注册/改密、管理密钥验证和大型提交改用持久化配额，正常请求不增加验证码或额外往返。
- **主动附件格式拒绝**：继续采用现有轻量 MIME 校验，并明确拒绝 HTML、XHTML 与 SVG，避免可执行主动内容进入附件预览链路。
- **投票反滥用框架**：新增按业务 scope、身份类型和摘要键持久化的通用配额框架，支持后续扩展账号、设备或风险主体；当前仅启用可信客户端 IP 维度，限制为 24 小时最多 20 次。
- **真实 IP 信任边界**：应用仅信任本机反向代理，nginx 示例仅从 Cloudflare 官方网段接收 `CF-Connecting-IP`，并覆盖转发头，避免客户端直接伪造来源 IP。
- **蜜罐封禁持久化**：蜜罐命中同时保存原始攻击来源 IP 与 HMAC 主键，前两次各封禁 24 小时，第三次及以后永久封禁；服务重启后仍然生效，可直接用于安全审计与手工处置。
- **公开信息提醒增强**：保留提交按钮上方的位置，强化公开榜单、昵称、自白和身价将公开展示的醒目提示。
- **测试隔离**：单元测试默认拦截未显式模拟的网络请求，并限制并发 worker，消除错误上报造成的本机接口噪声与偶发超时。

### 重构
- **契约去重与组件拆分**：特殊身价榜单改用前后端共享类型；拆分数据页、任务页、卷宗详情和题库工作台的大型子视图，保持现有行为不变并降低单文件复杂度。

## 2026-08-19（访问溯源：UA 落库 + nginx 真实 IP 日志）

### 新增
- **访问埋点记录 UA**：`page_visits` 新增 `user_agent` 列（迁移 v23），`/api/visit` 把请求头 User-Agent 截断 300 字符后落库，用于区分真人浏览器 / 爬虫 / 自动化工具。
- **nginx 真实 IP 访问日志**：`secret.neural-node.xyz` 与 `innerecho-console.neural-node.xyz` 新增独立访问日志 `innerecho-access.log` / `innerecho-console-access.log`（格式含 `CF-Connecting-IP` 访客真实 IP，同时保留 CF 边缘节点 IP、时间、请求、状态、Referer、UA）；随 `/var/log/nginx/*.log` 正常轮转。IP 不进应用数据库，维持「只存属地编码不存 IP」的隐私约定。

### 验证
- typecheck + 209 项测试全绿；部署成功（备份 `database.sqlite.bak-20260818190555`，迁移升至 v23）；生产库实测新访问写入 UA 正常，nginx 真实 IP 日志格式正确，探针数据已清理。

## 2026-08-17（Telegram 单向引流频道）

### 新增
- **TG 引流频道发布器**：新增 `server/telegramPublisher.ts`（纯 Node 内置 fetch，零新依赖）与 pm2 进程 `innerecho-tgchannel`——只发内容、不收消息、不建群、不交互，按 `TG_POST_INTERVAL_HOURS` 间隔自动把队列内容发到频道；发布队列独立于部署包（`/var/www/innerecho/telegram-posts.json`），日常改内容免部署。
- **24 篇预制引流帖**：`scripts/telegram-posts.json` 内容库（反差/失控/阴影/匿名自白主题，每条带 `utm_source=telegram` 测试链接），配合 `docs/TELEGRAM-CHANNEL-KIT.md` 运营包（建频道步骤、简介/置顶模板、互推话术、广告询价、导航站提交文案）。
- **部署脚本**：pm2 编排同步启停 `innerecho-tgchannel`。

## 2026-08-17（长尾内容主动推送 IndexNow）

### 新增
- **IndexNow 主动推送**：新增 `public/b8c027571ca99108795911fa71f2779b.txt` 密钥文件与 `scripts/submit-indexnow.ps1`，部署后一键把首页 + `/articles/` 汇总页 + 7 篇文章共 9 个 URL 推送到 api.indexnow.org（Bing/Yandex/Seznam/Naver）并直连 Bing 入口，无需等爬虫自然发现。

## 2026-08-16（回响池清理与文案收敛）

### 变更
- **删除全部预置种子回响**：迁移 v16 清空 `seed_echo_%` 数据，回响池不再展示虚假内容；公开列表初始为空。
- **移除回响池分类筛选**：用户端标签过滤条暂时下线，投掷心声时仍可选择阴影标签。
- **收敛面向用户的管理侧文案**：移除“完全匿名 · 先审后发”“审核通过后点亮”等内部审核表述，投掷成功提示改为中性文案；管理端回响审核功能不变。

### 验证
- 回响测试同步更新（公开列表初始为空）；typecheck / 168 项测试全绿。

## 2026-08-16（修复 LLM 报告缺失四个指数）

### 修复
- **报告指数缺失**：生效提示词模板的输出 JSON 未包含支配/臣服/克制/感官阈值四个字段，导致 LLM 从不输出、管理端按 0 返回。已为线上生效模板与内置默认模板补充这四个字段，并实测重新评估后返回真实数值（支配 15 / 臣服 92 / 克制 75 / 感官阈值 85）。
- 存量旧报告仍缺字段，可在管理端逐份执行「重新评估」补齐。

## 2026-08-16（用户自建题库审核流）

### 新增
- **题库审核机制**：用户自建题库新增 `audit_status`（草稿/待审核/已通过/未通过）；“发布”改为“提交审核”，审核通过后才公开可加载，驳回后仅创建者本人可见。
- **管理端审核操作**：题库工作台默认打开“待审核”队列，支持一键通过/驳回；状态筛选（待审核/已通过/未通过/草稿/全部）与统计卡片同步更新。
- **自动重新审核**：已通过的题库被作者修改后自动下架并回到待审核，避免绕过审核。
- **公开接口收紧**：`/api/banks/public/:id` 仅放行已通过审核的题库；存量已发布题库迁移为“已通过”，行为不变。

### 验证
- 新增审核接口、公开访问收敛与迁移 v14 测试；typecheck / 164 项测试 / 双端生产构建全绿。

## 2026-08-15（用户端/管理端域名与接口隔离）

### 变更
- **用户端与管理端彻底拆分**：生产由两个独立 pm2 进程运行——用户端 `secret.neural-node.xyz → :3001`，管理端 `innerecho-console.neural-node.xyz → :3003`（3002 已被服务器 nginx 导出仪表盘占用）；用户进程不挂载 `/api/admin`，管理进程不挂载任何用户接口。
- **前端产物分离**：`dist-user/`（用户 SPA、文章页、sw.js、sitemap）与 `dist-admin/`（仅管理端 admin.html 及资源）独立构建、独立部署目录，用户端产物不再包含管理入口。
- **提示词零暴露**：提示词模板仅存服务端数据库，用户端分析接口只返回 LLM 诊断结果，不返回模板内容；管理端模板接口仅在管理域可用。
- **纵深防御**：nginx 用户域示例配置直接拒绝 `/api/admin` 与 `/admin*`；部署脚本冒烟验证用户端口 `404`、管理端口 `401`。
- **SQLite 多进程安全**：启用 WAL + `busy_timeout=5000`，并调整部署顺序（先启动用户端完成迁移，再启动管理端）。

### 验证
- 新增用户/管理接口隔离集成测试；typecheck / 全部测试 / 双端生产构建通过。

## 2026-08-15（访问来源/地域统计 + 性别字段 + 管理后台重构；例行审查与部署）

### 新增
- **访问统计增强**：埋点上报来源（仅保留主机名，不存完整 URL）与市级归属地（仅存 6 位行政区划代码，不落 IP 与明文城市名）；`page_visits` 迁移 v11（referrer）、v12（region_code）。
- **管理后台统计补全**：总览新增访问来源分布、访客地域分布（城市名由代码映射）与本时段/累计完成任务数，前端新增对应卡片展示。
- **性别字段全链路**：第一章可选录入性别（女/男/保密），经提交载荷、卷宗落库（迁移 v13）与恢复链路贯通，管理端列表、身份档案与用户基础信息弹窗均可查看。
- **管理后台交互重构**：卷宗详情改为多标签 Modal（心理画像 / 完整答卷明细 / 作答者身份档案），卷宗列表按用户分组展示并新增「查看基础信息」用户档案弹窗；答卷明细按需通过详情接口加载。

### 修复
- **`recordVisit` 未写入 referrer/region_code**：路由已传参但数据库方法仍按旧签名落库，类型检查暴露后补齐 INSERT 字段。
- **`AdminOverview` 契约与实现不一致**：新增的 `sourceDistribution` / `regionDistribution` / `tasksCompleted` / `totalTasksCompleted` 此前仅存在于类型定义、服务端未聚合，现已补齐。
- **管理后台列表接口误带完整答题载荷**：列表项不再返回含 base64 附件的大体积 `quizPayload`，详情仍按需通过 `GET /api/admin/dossiers/:id` 拉取。
- **迁移 v1 被直接修改**：恢复历史迁移原样，性别字段统一由新迁移 v13 升级，符合「已发布迁移不可修改」规范。
- **私网 IP 判定过宽**：`100.x` / `169.x` 整段被误判为内网，收紧为 CGNAT（100.64.0.0/10）与 link-local（169.254.0.0/16）。
- **部署包缺失 IP 归属地数据**：`ip2region` xdb 二进制随构建自动拷贝进 `dist-server/server/data/geo` 并随部署包分发；xdb 已加入 `.gitignore` 不入仓库。
- **昵称重复度过高**：名称/昵称改为最少 2 个字符，且禁止 `aa`、`11`、`喵喵喵` 这类全重复字符名称（前端 `ChapterOneView` 与服务端 `analyzeDossierSchema` 同步校验，上限 20 字与输入框一致）。
- **长尾流量内容站**：新增 `/articles/` 静态 SEO 内容页（反差人格、反差自白、反差问卷、BDSM 倾向、失控渴望、阴影自我、匿名问卷 7 篇 + 汇总页），每页独立 title/description/canonical/OG/Article JSON-LD，文章互相内链并引导回问卷；sitemap 补齐全部文章 URL，robots 增加管理入口 `Disallow`，首页补 WebSite 结构化数据与社交分享标签；`/articles/` 目录由服务端显式提供汇总页，已下架文章返回真 404 而非 SPA 软 404。

### 验证
- typecheck / 151 项测试 / 生产构建全绿；依赖审计 0 漏洞（官方 registry）。
- IP 解析冒烟：杭州→330100、北京→110000、境外/内网 IP→空。
- 昵称规则单测：`ab`/`小明` 通过，`a`/`aa`/`11`/`喵喵喵` 拒绝。

## 2026-08-13（例行审查 + 修复）

### 审查
- 第三轮审查（基线 main @ cfa521f）：typecheck / 114 测试 / build 全绿后走读，详见 `内部审查文档（未随仓库发布）` 第 8 节。
- 确认 `origin/codex/harden-dossier-llm` 为旧 WIP 分叉（3D 海报等已由 main 移除/重构），不作为部署基线。

### 修复
- 任务列表容错：`GET /api/tasks` 历史附件 JSON 解析加 try/catch 兜底，损坏数据不再导致整个接口 500；`completedHistory` 由 `any[]` 改为显式类型，并抽离 `loadAllTaskDefs` 消除三处重复映射。
- 卷宗提交载荷补全：`App.tsx` 合并 payload 时纳入草稿期 chapter2/3 自白、`selectedShadowTags`、`depthRating`，此前这些数据不会进入后端落库/LLM 分析；同时移除三处 `as any` 类型掩盖。
- 登录规范化：`loginSchema` 与 `registerSchema` 对齐（trim + 小写），避免大小写/空格导致无法登录。
- 请求体上限：`express.json` 8mb → 10mb，修复附件总上限 6MB（base64 ≈ 8MB）会在校验前被 413 截断的矛盾。
- 共享契约补全：`RestoredDossierContract` 增加 `bankIds` 字段，前端 calculator 移除 `as any` 边界断言。

## 2026-08-10（修复 + 第一轮审查）

### 修复
- **P0（C1）**：`/api/analyze-dossier` 请求补发 `X-Device-Id`（`getOrCreateDeviceId()`），匿名测评恢复落库；后端在“无身份丢弃”时输出 warn 日志，不再静默丢数据。
- **C3**：`sanitizePayloadForLog` 扩展脱敏——昵称/职业/年龄/婚恋/头像等身份字段与完整题库文本（`completedBanks`）、媒体附件不再写入错误日志。
- **C4**：LLM 服务端超时 30s → 60s，并支持超时/网络异常首次重试；前端提交超时对齐到 120s。
- **C5**：部署脚本不再每次重生成 `JWT_SECRET`/`ADMIN_TOKEN`，仅首次缺失时生成，保留已有登录会话。
- **C6**：按真实客户端 IP 限流（优先 `CF-Connecting-IP`），修复 Cloudflare 边缘节点聚合导致的限流失真；错误日志记录真实 IP。
- **C8**：部署脚本自动带时间戳备份数据库。
- **C10**：部署脚本将数据库文件权限收紧为 600。
- **C12**：README 功能清单与实际实现同步。

### 新增
- 回归测试 `src/utils/analyzeRequest.test.ts`：防止匿名测评再次漏发设备标识。
- `内部审查文档（未随仓库发布）`：完整审查文档（第一轮结论：不通过，整改后复审）。
- **网站访问统计**：迁移 v3 新增 `page_visits` 表；`POST /api/visit` 埋点（带设备标识）；`/api/stats` 返回今日 PV/UV 与累计访问量；前端页面挂载时静默上报一次。

### 运维
- 部署脚本：自动备份数据库（C8）、保留既有密钥不重生成（C5）、数据库文件权限收紧 600（C10）。
- 服务器已安装 `pm2-logrotate`（10M×7 份，C11）。
- **设备 ID 加固**：`getOrCreateDeviceId` 在 localStorage 不可用（严格隐私模式）时退回内存临时 ID，保证测评与访问统计仍可落库。
- **本地备份同步**：新增本机备份同步脚本（未随仓库发布），每日定时将服务器数据库与备份同步到本地 D 盘。

### 外部协作
- UI 移动端适配由 Gemini 完成（欢迎页单屏、题库选择、问答卡片、CSS 媒体查询）。
