# Web App 健壮性与交互规范化改造方案

## 目标

本方案用于修复应用在渲染异常、懒加载失败、网络请求失败、状态混淆和重复提交方面的缺陷，确保系统在断网、服务端异常、登录失效或动态分包加载失败时：

- 不出现全屏白屏；
- 不将请求失败错误展示为“暂无数据”；
- 不因旧请求延迟返回而覆盖当前用户的数据；
- 不因重复点击导致重复提交或路由竞态；
- 能向用户提供明确、可恢复的错误反馈。

## 一、统一加载状态

所有数据页面统一使用显式状态，而不是依赖多个含义重叠的 Boolean：

```ts
type LoadStatus = 'idle' | 'loading' | 'ready' | 'refreshing' | 'error';
```

统一渲染规则：

- 首次加载且没有旧数据：显示加载态；
- 加载失败且没有旧数据：显示错误卡片和重试按钮；
- 刷新失败但存在旧数据：保留旧数据，并显示非阻塞警告；
- 加载成功但数据为空：显示真正的空态；
- 用户切换或退出登录：立即终止请求并清理上一用户的数据。

## 二、React 懒加载与渲染异常防护

### [NEW] `src/components/ErrorBoundary.tsx`

创建通用 React Error Boundary，包含：

- `getDerivedStateFromError`；
- `componentDidCatch`；
- `resetKey`；
- `onReset`；
- “返回安全页面”操作；
- “刷新重试”操作。

建议组件接口：

```ts
interface ErrorBoundaryProps {
  children: React.ReactNode;
  resetKey?: string;
  onReset?: () => void;
}
```

错误界面要求：

- 复用现有 `glass-card`、CSS 变量和霓虹风格；
- 使用 `role="alert"`；
- 使用“页面加载失败”等通用文案，不将所有渲染错误断言为网络故障；
- 离线时提示用户恢复网络；
- 在线时提供“刷新重试”；
- 提供“返回首页”作为安全退出路径；
- `componentDidCatch` 中进行 best-effort 错误记录或 Sentry 上报，上报失败不得影响错误页面。

为避免 Service Worker 返回缓存中的旧首页，恢复刷新使用带时间戳的根地址：

```ts
const url = new URL('/', window.location.origin);
url.searchParams.set('__recover', Date.now().toString());
window.location.replace(url);
```

不应无条件清空全部站点缓存。

### [MODIFY] `src/App.tsx`

分别保护主页面区域和位于主区域外的登录弹窗：

```tsx
<main>
  <ErrorBoundary
    key={viewState}
    resetKey={viewState}
    onReset={() => setViewState('welcome')}
  >
    <Suspense fallback={ViewLoadingFallback}>
      {/* 页面视图 */}
    </Suspense>
  </ErrorBoundary>
</main>

<ErrorBoundary resetKey={String(authModalOpen)}>
  <Suspense fallback={null}>
    {/* AuthModal */}
  </Suspense>
</ErrorBoundary>
```

预期结果：

- 捕获主页面内所有 `React.lazy` 加载失败和子组件渲染异常；
- 单独保护 `<main>` 外的 `AuthModal`；
- 切换页面时重置上一页面产生的错误；
- 主页面失败后 Header 和底部导航仍可工作。

Error Boundary 仅负责渲染、生命周期和懒加载异常。接口 Promise、事件回调和定时器错误仍必须在各自业务逻辑中处理。

## 三、个人中心请求治理

### [MODIFY] `src/components/PersonalView.tsx`

Stats 和 Dossiers 使用完全独立的加载状态：

```ts
const [statsStatus, setStatsStatus] = useState<LoadStatus>('idle');
const [statsError, setStatsError] = useState<string | null>(null);

const [dossiersStatus, setDossiersStatus] = useState<LoadStatus>('idle');
const [dossiersError, setDossiersError] = useState<string | null>(null);
```

分别抽取以下请求函数：

```ts
loadStats()
loadDossiers()
```

每个加载函数必须：

1. 中止上一次同类请求；
2. 清除对应的旧错误；
3. 根据是否存在旧数据设置 `loading` 或 `refreshing`；
4. 使用 `apiGet` 发起请求；
5. 校验 `success` 以及业务数据字段；
6. 只允许当前请求回写状态；
7. 在 401 时触发统一的登录失效处理；
8. 在重试成功后清除错误状态。

用户变化时需要清理旧数据并取消未完成请求：

```ts
useEffect(() => {
  // 清理上一用户的数据
  // 启动两个独立请求
  // cleanup 中 abort
}, [user?.id]);
```

渲染规则：

- Stats 失败：仅在统计区域显示错误提示，不影响历史卷宗；
- Dossiers 失败且没有旧数据：显示“加载失败，点击重试”；
- Dossiers 加载成功但为空：显示“暂无历史自白卷宗记录”；
- Dossiers 存在旧数据但刷新失败：保留旧卷宗并显示非阻塞警告；
- Stats 和 Dossiers 中任一失败，不得阻止另一区域正常展示。

同时将卷宗列表的 `any[]` 替换为明确的响应类型。

## 四、任务中心 API 与错误状态规范化

### [MODIFY] `src/components/TasksView.tsx`

将以下原生 `fetch` 全部替换为项目现有的 `apiGet` 和 `apiPost`：

- 获取任务列表；
- 接取任务；
- 完成任务；
- 发布自定义任务。

定义明确的响应类型：

```ts
interface TaskListResponse {
  success: boolean;
  tasks: TaskInfo[];
  completedCount: number;
  totalAcceptedCount: number;
  completedHistory: CompletedTask[];
}
```

调用 `apiGet` 时必须正确解构其返回值：

```ts
const { data } = await apiGet<TaskListResponse>('/api/tasks', {
  signal,
  onUnauthorized: onSessionExpired,
});
```

### 列表状态

```ts
const [tasksStatus, setTasksStatus] = useState<LoadStatus>('idle');
const [tasksError, setTasksError] = useState<string | null>(null);
```

渲染规则：

- `loading` 且没有数据：显示加载动画；
- `error` 且没有数据：显示错误重试卡片；
- `ready` 且任务为空：显示原有“暂无可用任务”空态；
- `refreshing`：保留列表并显示轻量刷新状态；
- 存在旧数据但刷新失败：保留旧数据并显示警告条。

### 操作错误

不同操作使用独立的错误状态：

- `acceptError`：接取任务失败；
- `formError`：提交任务成果失败；
- `publishError`：发布任务失败；
- `tasksError`：任务列表加载失败。

不得使用 `tasksError` 表示接取、完成或发布失败。

如果任务操作已经成功，但随后的列表刷新失败：

- 操作仍按成功处理；
- 正常关闭弹窗或完成页面跳转；
- 显示“操作成功，但列表刷新失败，请点击刷新”；
- 不得将刷新失败误报为操作失败。

所有 `ApiError` 应优先展示服务端返回的安全错误信息，并为未知错误提供统一兜底文案。

## 五、统一登录失效处理

### [MODIFY] `src/components/PersonalView.tsx`

### [MODIFY] `src/components/TasksView.tsx`

两个组件增加以下属性：

```ts
onSessionExpired: () => void;
```

### [MODIFY] `src/App.tsx`

由 App 提供幂等的登录失效处理函数，负责：

- 清除失效登录态；
- 清除用户私有数据和缓存；
- 返回安全页面；
- 打开登录弹窗或显示重新登录提示。

该回调必须允许被重复调用，因为多个并发请求可能同时收到 401。

## 六、基础信息提交防连击

### [MODIFY] `src/components/ChapterOneView.tsx`

将回调类型调整为：

```ts
onNext: (data: ChapterOneData) => void | Promise<void>;
```

同时使用 State 和 Ref：

```ts
const [isSubmitting, setIsSubmitting] = useState(false);
const submittingRef = useRef(false);
```

提交处理：

```ts
const handleSubmit = async () => {
  if (submittingRef.current) return;

  // 表单校验与 payload 构建

  submittingRef.current = true;
  setIsSubmitting(true);

  try {
    await onNext(payload);
  } catch {
    setErrorMsg('保存失败，请稍后重试');
  } finally {
    submittingRef.current = false;
    setIsSubmitting(false);
  }
};
```

按钮调整为：

```tsx
<button
  type="button"
  disabled={isSubmitting}
  onClick={handleSubmit}
>
  {isSubmitting ? '正在保存...' : '保存并前往题库'}
</button>
```

Ref 负责同步阻止连续事件，State 负责按钮禁用状态和视觉反馈。

## 七、自动化验证

如当前前端测试环境缺少 DOM 测试支持，补充以下开发依赖：

- `jsdom`；
- `@testing-library/react`；
- `@testing-library/user-event`。

新增自动化测试：

- Error Boundary 能捕获子组件渲染异常并显示恢复界面；
- PersonalView Stats 失败但 Dossiers 成功时，两部分独立展示；
- Dossiers 失败后可以重试成功；
- 旧用户请求不能覆盖新用户数据；
- Tasks 首次加载失败时显示错误态而不是空态；
- Tasks 存在旧数据时刷新失败仍保留数据；
- 401 能触发统一的登录失效回调；
- HTTP 500 的安全错误信息能够正确展示；
- 任务操作成功但刷新失败时不会误报操作失败；
- ChapterOne 连续点击时只调用一次 `onNext`。

执行以下检查：

```bash
npm run typecheck
npm test
npm run build
```

## 八、实施顺序

1. 创建 `ErrorBoundary` 并调整 App 包装范围；
2. 改造 PersonalView 的独立请求状态、取消机制和重试逻辑；
3. 迁移 TasksView API 并区分列表错误和操作错误；
4. 接入统一的登录失效处理；
5. 增加 ChapterOne 同步防重入和按钮状态；
6. 补充自动化测试；
7. 执行类型检查、测试和生产构建。

## 完成标准

- 所有懒加载页面和登录弹窗均受 Error Boundary 保护；
- API 请求失败不会被展示为空数据；
- 重试期间不会产生旧请求覆盖新状态的问题；
- 401 能统一退出失效会话；
- 有旧数据的刷新失败不会清空页面；
- 任务操作结果和列表刷新结果不会混淆；
- 基础信息连续点击不会重复提交；
- 类型检查、自动化测试和生产构建全部通过。
