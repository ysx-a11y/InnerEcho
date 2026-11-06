# InnerEcho 开发规范

本规范用于约束 InnerEcho 的日常开发、维护和代码审查。目标不是建立复杂架构，而是保证代码可理解、可验证、可迁移，并避免继续积累隐式耦合。

规范中的“必须”是合并门槛；“应当”允许在有明确理由时例外。例外必须在代码注释、提交说明或 PR 描述中解释。

## 1. 总体原则

1. 每次修改只解决一个明确问题，不顺手改动无关页面、业务流程或视觉设计。
2. 优先使用项目已有能力。没有明确收益时，不引入新框架、状态库、ORM、依赖注入容器或工具链。
3. 先修正边界和数据流，再增加抽象。只有出现至少两处真实重复或一个明显职责混杂点时才提取公共层。
4. 保持现有用户流程兼容。改变登录、答题、报告生成或数据保存行为前，必须写明影响。
5. 不以“以后可能需要”为理由预先设计复杂扩展点。
6. 非必要代码文件行数严控 1000 行以内（只读静态题库/预置数据除外）。业务文件接近 1000 行时应在后续演进中按领域模块、子组件或独立服务进行拆分解耦，禁止无节制堆叠。

## 2. 目录与职责

```text
src/                 浏览器端 UI 与交互
  components/        可复用组件或完整视图
  hooks/             有生命周期的前端状态与副作用
  utils/             无 UI 的前端工具和 API 客户端
server/
  routes/            HTTP 协议适配：校验、鉴权、状态码、响应
  services/          跨数据库、LLM 或多个步骤的业务流程
  db/                数据库迁移及数据库基础能力
  http/              Express 通用辅助能力
shared/              前后端共享、且不含运行时副作用的 API 契约
docs/                产品和工程文档
scripts/             构建、导出和维护脚本
```

必须遵守：

- 路由不得包含大段业务编排。超过约 40 行或同时操作 LLM、数据库和日志时，应移入 `server/services/`。
- React 组件不得直接包含可复用的会话、持久化或复杂请求生命周期；应移入 Hook 或 API 工具。
- `shared/` 只能包含类型、常量和纯函数，不得导入 React、Express、数据库或 Node 专用模块。
- 不得从 `src/` 导入 `server/`，也不得从 `server/` 导入 `src/`。

## 3. TypeScript 与数据契约

1. 新代码禁止使用无说明的 `any`。外部输入首先使用 `unknown`，经 Zod 校验或类型守卫后再使用。
2. API 的核心请求和响应类型放在 `shared/apiContracts.ts`，前后端不得各自复制一份相同结构。
3. 数据库行类型、内部日志类型和仅服务端使用的模型保留在 `server/`，不要为了“统一”全部移入共享层。
4. 可辨识联合类型优先于多个相互关联的布尔值。
5. 类型断言 `as` 只能用于边界适配；不得用它掩盖校验缺失或类型设计错误。
6. 新增公共函数必须声明参数与返回类型。

## 4. API 与错误处理

1. 所有外部请求体必须使用 Zod 校验，并限制字符串、数组和上传内容的大小。
2. 需要登录的接口必须使用 `requireAuth`；支持匿名访问的接口只能通过验证用户当前状态的软认证方法获取用户 ID。
3. 异步路由必须通过 `asyncHandler` 或显式转发错误，不得留下未处理的 Promise rejection。
4. 路由只负责：
   - 请求校验；
   - 鉴权；
   - 调用 service 或数据库方法；
   - 选择 HTTP 状态码并返回响应。
5. 500 响应不得把堆栈、SQL、密钥、上游响应正文或内部异常细节返回给客户端。
6. 4xx 用于可预期的客户端错误；业务冲突使用稳定、可测试的状态码。
7. 修改现有响应结构时，必须同步更新 `shared/` 契约和调用端。

## 5. 数据库与迁移

1. 禁止在应用启动代码中散落 `ALTER TABLE`。
2. 所有结构变更必须追加到 `server/db/migrations.ts`，使用单调递增的 `user_version`。
3. 已发布的迁移不得修改；修正旧迁移必须新增下一版本迁移。
4. 每个迁移必须在事务中执行，并支持从上一个生产版本升级。
5. 数据库方法必须使用参数绑定，禁止拼接用户输入生成 SQL。
6. 测试必须使用内存数据库或独立临时数据库，不得访问开发或生产数据库文件。
7. 删除字段、表或用户数据前，必须说明数据迁移、备份和恢复方案。

### server/db 模块布局（2026-08-16 起）

- `server/db.ts` 只做 `export * from './db/index.js'` 桥接；业务代码一律从 `server/db.ts` 引用 `db`，不得直接 import 仓储文件。
- `connection.ts`：打开连接、WAL/`busy_timeout`、迁移 + 加密升级 + 种子的一次性初始化；测试注入独立库用 `initDatabaseSync(rawDb)`。
- `crypto.ts`：字段加密 / JSON 信封编解码与存量明文升级；`helpers.ts`：`genId`/`safeJsonParse`/`fuzzCount` 等纯函数。
- `index.ts`：`DatabaseFacade` 聚合全部仓储方法，对外保持与原 `db.ts` 相同的 async 门面（底层为同步调用）。
- `repositories/`：按领域分文件，只持有自己表的 SQL；跨表读侧组合（如题库名解析）由 facade 层注入回调完成，仓储之间不互相引用。

## 6. 隐私与安全

本项目处理私密问卷和心理倾向数据，隐私要求高于普通内容应用。

必须遵守：

- 日志中不得记录 API Key、密码、Cookie、JWT、完整问卷文本、图片 DataURL 或私密自白。
- 发往 LLM 的数据必须是完成当前分析所必需的最小集合。
- `credibilityScore` 和 `credibilityLevel` 仅供内部使用，不得展示给普通用户。
- 用户注销、密码修改和令牌失效必须有集成测试。
- 身份归属只认 `user_id`。登录态查询禁止用 `device_id` 直接匹配账号数据，只允许匹配 `user_id IS NULL` 的匿名遗留：
  `user_id = ? OR (user_id IS NULL AND device_id = ?)`。设备指纹在注销、重新注册后都不会轮换，一旦把它当账号键，
  同一浏览器上前一个账号（可能是已注销账号）的数据就会出现在新账号里。新增查询必须遵守此口径，并补「同设备注销后重新注册不得读到旧账号数据」的回归测试。
- 交互状态（已共鸣、已投票、我的排位等）同样属于账号数据：登录态的「我的状态」不得回落到设备匹配，只有匿名访客才可用
  `user_id IS NULL AND device_id = ?` 匹配。`echo_resonances` / `special_evaluation_votes` 的唯一键是
  `(目标, user_id) WHERE user_id IS NOT NULL` + `(目标, device_id) WHERE user_id IS NULL`（migration v34），不要再按设备给登录态去重。
- 私有数据接口一律 `Cache-Control: no-store`（`server/app.ts` 对 `/api` 统一设置）。注销/切换账号后不得让浏览器 304 复用旧身份的响应。
- 新增第三方服务前，必须说明发送的数据、保存期限和失败行为。
- `.env`、数据库文件和构建产物不得提交到 Git。

## 7. React 与界面代码

1. `App.tsx` 只保留顶层流程协调，不新增具体表单实现或底层 API 细节。
2. 组件应使用显式 Props；不得依赖隐式全局变量或跨组件可变单例。
3. 副作用放在 `useEffect` 或 Hook 中，并处理卸载、AbortController 和失败路径。
4. 不得在渲染过程中修改状态、写入存储或发起请求。
5. 只有多个远距离组件确实共享状态时才引入 Context；当前阶段不引入 Redux 或其他全局状态库。
6. 修改核心移动端页面后，至少检查 360px、768px 和桌面宽度。
7. 保留 `.agents/AGENTS.md` 中的视觉、防溢出和业务流程约束。

## 8. 测试要求

修改类型与最低测试要求：

| 修改内容 | 必须验证 |
| --- | --- |
| 纯函数、评分或转换逻辑 | 单元测试 |
| Zod Schema | 合法与非法输入测试 |
| 登录、权限、数据所有权 | API 集成测试 |
| 数据库结构 | 新库迁移和旧版本升级测试 |
| Bug 修复 | 至少一个修复前失败、修复后通过的回归测试 |
| UI 核心流程变化 | 手工流程验证；复杂交互再增加 E2E |

测试要求：

- 测试必须可重复运行，不依赖执行顺序、真实网络、真实 API Key 或本地开发数据。
- 不追求形式化覆盖率数字；优先覆盖权限、隐私、迁移和核心流程。
- 不得通过放宽断言、跳过测试或吞掉异常来让测试通过。

## 9. 构建、依赖与提交门禁

提交前必须执行：

```bash
npm run typecheck
npm test
npm run build
```

`npm test` 默认静默：非交互环境（CI/自动化/管道）只输出失败与汇总，交互终端保持
默认进度；需要完整进度时使用 `npm run test:verbose`。不新增任何强制提交门禁。

涉及依赖变化时还必须执行：

```bash
npm ci
npm audit
```

其他规则：

- `package.json` 与 `package-lock.json` 必须同步。
- 生产构建不得包含测试文件。
- `dist/` 和 `dist-server/` 是生成物，不提交到 Git。
- 新增依赖前必须确认标准库或已有依赖不能满足需求。
- 不为单个简单函数引入依赖。
- 提交应聚焦且可回滚；不要把功能、格式化和无关重构混在同一提交。

## 10. 代码审查清单

提交或 PR 前逐项确认：

- [ ] 修改范围与需求一致，没有顺手改变未提及的流程。
- [ ] 路由、service、数据库和 UI 职责边界清楚。
- [ ] 外部输入已校验，敏感数据没有进入日志。
- [ ] 权限查询同时约束资源 ID 与当前用户 ID。
- [ ] 数据库变化通过新迁移实现并有升级测试。
- [ ] 前后端共享结构没有重复定义。
- [ ] 新增抽象确实减少了重复或职责混杂。
- [ ] 类型检查、测试和生产构建通过。
- [ ] 工作区不包含数据库、密钥或构建产物。

## 11. 停止过度设计

出现以下情况时应停止继续抽象：

- 新层只有一个调用方，且没有隔离复杂副作用；
- 为了“统一”而需要大量泛型、工厂或配置；
- 代码行数和理解成本增加，但测试或复用没有改善；
- 当前产品需求尚未出现，只是在猜测未来扩展；
- 一个简单修改需要跨越四层以上才能完成。

InnerEcho 当前采用轻量分层，而不是企业级架构。规范的目标是让下一位开发者能安全修改代码，不是让目录看起来更复杂。

## 12. 用户端/管理端隔离（部署约束）

用户端与管理端必须保持接口与产物双重隔离，这是安全红线：

- **域名**：用户端 `secret.neural-node.xyz`；管理端 `innerecho-console.neural-node.xyz`。
- **服务进程**：生产环境由 `ecosystem.config.cjs` 启动两个独立 pm2 进程：
  - `innerecho-user`（`APP_MODE=user`，端口 3001）：只挂载用户接口（`/api/auth`、`/api/analyze-dossier`、`/api/banks`、`/api/dossiers`、`/api/visits`、`/api/tasks`、`/api/mailbox`、`/api/interrogation`），**不挂载 `/api/admin`**。
  - `innerecho-admin`（`APP_MODE=admin`，端口 3003；3002 已被服务器 nginx 导出仪表盘占用）：只挂载 `/api/admin`，**不挂载任何用户接口**。
  - `APP_MODE=all` 的组合应用仅限本地开发/测试，禁止用于生产。
- **前端构建**：用户端构建输出 `dist-user/`，管理端构建输出 `dist-admin/`（`npm run build:user` / `npm run build:admin`），用户端产物里不存在 `admin.html` 或管理端资源。
- **nginx**：用户域必须拒绝 `/api/admin` 与 `/admin*`（见 `scripts/nginx/innerecho-user.conf.example`），管理域单独反代到 3003（见 `scripts/nginx/innerecho-admin.conf.example`）。
- **提示词**：提示词模板只存在于服务端数据库，由用户端分析服务在服务端组装后调用 LLM；任何用户接口都不得返回模板内容，管理端模板接口只允许在管理域访问。
- **数据库**：两个进程共享同一 SQLite 文件，`db.ts` 已启用 WAL 与 `busy_timeout`；部署脚本先启动用户端完成迁移，再启动管理端。

## 13. 用户自建题库审核流

用户自建题库不再允许“一键公开”，统一走审核：

- **状态机**：`draft`（草稿，仅作者可见）→ `pending`（提交审核，仅作者可见）→ `approved`（通过，公开可加载）或 `rejected`（驳回，仅作者可见）。
- **用户端**：`发布` 按钮实际是“提交审核”；已通过的题库一旦被作者修改，自动回到 `pending` 并下架，需重新审核。
- **公开加载**：`GET /api/banks/public/:id` 只返回 `audit_status='approved'` 且 `is_published=1` 的题库；待审核/驳回/草稿即使拿到 ID 也返回 404。
- **管理端**：题库工作台默认显示“待审核”队列，可一键“通过审核 / 驳回”；内置预设题库不参与审核。
- **存量数据**：迁移 v14 把已发布题库标记为 `approved`，草稿保持 `draft`，行为与迁移前一致。

## 14. 运营事实与排查备忘

涉及线上账号、时间口径、数据语义、部署排障等易误判的信息，由运营方单独维护（不在本仓库内）。

## 15. 审讯室（测试功能）

- **入口**：已登录用户在首页第三层上方看到通栏「审讯室」门（`src/components/PortalView.tsx` 的 `onOpenInterrogation`）；游客不渲染门，直接访问 `#/interrogation` 也会回落到欢迎页。
- **当前状态（暂时关闭）**：房间代码与后端接口保留，但门牌点击不再进入房间，改为弹窗「暂未开启」（`src/components/InterrogationClosedModal.tsx`）；直接访问 `#/interrogation` 同样回落首页并给出该提示。重新开放时把 `src/App.tsx` 的 `handleOpenInterrogation` 改回 `navigateTo('interrogation')` 并移除对应的回退 `useEffect` 即可。
- **前端**：`src/components/InterrogationRoomView.tsx`，标注「测试功能」；对话到上限后显示「暂未开放更多对话」与「生成审讯总结」按钮。
- **接口**：`GET /api/interrogation/state`、`POST /api/interrogation/messages`、`POST /api/interrogation/summary`，统一 `requireAuth`；会话与消息归属只认 `user_id`，不读取设备指纹。
- **额度**：默认 5 轮、输入 1200 token、输出 300 token；每轮按输入预算裁剪历史，输出按句数与输出预算限制，超限返回 `input_too_long` 等错误码。
- **提示词**：默认文案在 `server/services/interrogationPrompts.ts`（`DEFAULT_INTERROGATOR_PROMPT` / `DEFAULT_SUMMARY_PROMPT`），审讯者提示词里的 `{{dossier}}` 会替换为来访者档案（未写占位符时自动追加）。管理端可覆盖，存 `app_settings` 的 `interrogation.prompt.interrogator` / `interrogation.prompt.summary`；传空串即恢复默认，保存后下一轮对话生效（已产生的回复与总结不回改）。上限：审讯者 4000 字符、总结 1600 字符。
- **调整入口**：管理后台「审讯室」页（`GET /api/admin/interrogation/config`、`PUT /api/admin/interrogation/config`），写 `app_settings` 的 `interrogation.max_turns` / `interrogation.max_input_tokens` / `interrogation.max_output_tokens` 与上面两个提示词键；保存后下一轮立即生效，无需发版。
- **数据**：迁移 v35 新增 `interrogation_sessions` 与 `interrogation_messages`；管理端只读最近会话用量，不展开对话正文。
