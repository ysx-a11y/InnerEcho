# Cloudflare 小黄云性能配置清单

> 状态：待在服务器与 Cloudflare 控制台实施  
> 适用域名：`secret.neural-node.xyz`  
> 记录日期：2026-08-20  
> 目标：不使用优选 IP、不自建地区探测服务，以低维护成本提高边缘缓存命中率

## 1. 当前线上基线

2026-08-20 从外部请求线上站点时观察到：

- 首页支持 HTTP/3，响应包含 `alt-svc: h3=":443"`。
- 首页与 JavaScript 已使用 Brotli，响应包含 `content-encoding: br`。
- 哈希静态资源使用 `Cache-Control: public, max-age=31536000, immutable`。
- 静态 JavaScript 首次访问为 `CF-Cache-Status: MISS`，再次访问为 `HIT`，这部分工作正常。
- 首页 HTML 为 `Cache-Control: public, max-age=0`，状态为 `CF-Cache-Status: REVALIDATED`；边缘节点仍需向源站确认 HTML 是否变化。

因此不需要继续调整包体，也不需要寻找固定优选 IP。当前最有价值的改动是让公开 HTML 在 Cloudflare 边缘短时命中，同时继续保证部署后能迅速更新。

## 2. 目标缓存策略

| 资源 | 浏览器缓存 | Cloudflare 边缘缓存 | 说明 |
| --- | --- | --- | --- |
| `/assets/*` 哈希资源 | 1 年 immutable | 1 年或遵循现有响应头 | 文件名带内容哈希，继续保持现状 |
| 用户端首页 HTML `/` | 每次确认 | 5 分钟，允许短时 stale | 降低跨境回源次数 |
| `/api/*` | 不缓存 | 不缓存 | 可能包含用户状态与敏感数据 |
| 管理端 HTML `/admin*` | 不缓存或每次确认 | 不缓存 | 单人管理端无需性能换安全边界 |
| `sw.js` | 每次确认 | 不做长期缓存 | 避免旧 Service Worker 延迟更新 |

## 3. 服务器端修改

服务器权限所在电脑上，将用户端首页 HTML 的响应头调整为：

```http
Cache-Control: no-cache
Cloudflare-CDN-Cache-Control: public, max-age=300, stale-while-revalidate=60
```

含义：

- 浏览器仍会确认 HTML 是否更新，不把页面长期锁在本地。
- Cloudflare 边缘可以复用 HTML 5 分钟。
- 边缘过期后的 60 秒内可以先返回旧页面，同时后台重新验证。

继续保留哈希静态资源现有响应头：

```http
Cache-Control: public, max-age=31536000, immutable
```

API 建议明确返回：

```http
Cache-Control: no-store
```

管理端 HTML 与 `sw.js` 至少保持：

```http
Cache-Control: no-cache
```

`Cloudflare-CDN-Cache-Control` 用于把 CDN TTL 与浏览器 TTL 分开。Cloudflare 对该响应头的说明见 [CDN-Cache-Control 文档](https://developers.cloudflare.com/cache/concepts/cdn-cache-control/)。

## 4. Cloudflare 控制台操作

### 4.1 建立敏感路径绕过规则

进入：

`Caching → Cache Rules → Create rule`

规则名称建议：

```text
Bypass API and admin cache
```

表达式：

```text
(starts_with(http.request.uri.path, "/api/") or
 http.request.uri.path eq "/api" or
 starts_with(http.request.uri.path, "/admin") or
 http.request.uri.path eq "/sw.js")
```

操作：

```text
Cache eligibility: Bypass cache
```

这条规则放在后面的公开页面缓存规则之后，确保发生冲突时最终结果仍为绕过。Cloudflare Cache Rules 冲突时最后一条匹配规则生效，参见 [规则顺序说明](https://developers.cloudflare.com/cache/how-to/cache-rules/order/)。

### 4.2 让用户端首页具备缓存资格

再创建一条规则，名称建议：

```text
Cache public app shell
```

表达式：

```text
(http.host eq "secret.neural-node.xyz" and
 http.request.method eq "GET" and
 http.request.uri.path eq "/")
```

操作：

```text
Cache eligibility: Eligible for cache
```

不要在这条规则里设置很长的 Edge Cache TTL，优先遵循服务器返回的 `Cloudflare-CDN-Cache-Control: max-age=300`。免费套餐通过 Cache Rule 强制设置 Edge Cache TTL 时，最小值可能比所需的 5 分钟更长。

Cloudflare 默认不缓存 HTML，必须通过 Cache Rule 将它设为可缓存；参见 [默认缓存行为](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/) 与 [Cache Everything 示例](https://developers.cloudflare.com/cache/how-to/cache-rules/examples/cache-everything/)。

### 4.3 检查规则顺序

最终顺序应保证：

1. `Cache public app shell`
2. `Bypass API and admin cache`

因为后匹配的绕过规则优先，未来即使公开页面规则扩展范围，也不会意外缓存 API、管理端或 Service Worker。

### 4.4 开启 Smart Tiered Cache

进入：

`Caching → Tiered Cache`

启用：

```text
Tiered Cache: On
Topology: Smart
```

Tiered Cache 与 Smart Topology 对所有套餐可用，可减少分散的边缘节点直接访问源站。官方说明见 [Tiered Cache 文档](https://developers.cloudflare.com/cache/how-to/tiered-cache/)。

如果源站位于 AWS、GCP、Azure 或 Oracle Cloud，再进入 Origin Configuration 设置对应的 Cloud Region Hint。普通 VPS 或自建服务器不需要填写。

## 5. 保持不变的设置

以下能力线上已经生效，无需重复折腾：

- HTTP/3：保持开启。Cloudflare 所有套餐均支持，[HTTP/3 文档](https://developers.cloudflare.com/speed/optimization/protocol/http3/)。
- Brotli/Zstandard/Gzip：保持 Cloudflare 自动协商；当前线上已返回 Brotli。[压缩文档](https://developers.cloudflare.com/speed/optimization/content/compression/)
- `/assets/*` 一年 immutable：保持现状。
- 用户端 API 不进入 Service Worker：保持现状。

不建议开启或实施：

- 不使用第三方固定“优选 IP”或手工 hosts。
- 不自建全国探测、运营商 IP 扫描和调度系统。
- 不开启 Rocket Loader；当前是 Vite ES Module 应用，收益有限且会增加脚本时序风险。
- 不为这个 SPA 单独折腾 Speed Brain；它主要优化完整页面间的后续导航，站内核心流程是客户端视图切换。
- 暂不购买 Cache Reserve、APO 或其他与当前应用不匹配的产品。

## 6. 安全部署顺序

HTML 会引用带哈希的 JavaScript 和 CSS。若部署时删除旧静态资源，但 Cloudflare 仍返回旧 HTML，旧 HTML 可能引用已经不存在的文件。因此按以下顺序操作：

1. 完成服务器响应头配置。
2. 完成 Cloudflare Cache Rules 和 Smart Tiered Cache 配置。
3. 部署新版本应用。
4. 在 Cloudflare 执行 `Caching → Purge Cache`。
5. 小站可以直接 `Purge Everything`；也可以至少清理首页 `/`。
6. 等待几十秒后执行下一节的验证。

以后每次部署都应清理首页 HTML 缓存。哈希静态资源原则上不需要主动清理，但 `Purge Everything` 对当前小站也可以接受。

## 7. 验证方法

在任意一台能访问网站的电脑上执行：

```bash
curl -I --compressed https://secret.neural-node.xyz/
curl -I --compressed https://secret.neural-node.xyz/
```

第一次可能看到：

```text
CF-Cache-Status: MISS
```

短时间内第二次应看到：

```text
CF-Cache-Status: HIT
Age: ...
Content-Encoding: br
```

检查静态资源时，从浏览器开发者工具复制当前真实的哈希文件路径，再连续请求两次：

```bash
curl -I --compressed https://secret.neural-node.xyz/assets/当前文件名.js
```

期望看到：

```text
CF-Cache-Status: HIT
Cache-Control: public, max-age=31536000, immutable
```

检查 API：

```bash
curl -I https://secret.neural-node.xyz/api/health
```

API 不应出现 `HIT`。根据端点实现，预期为 `DYNAMIC`、`BYPASS` 或其他非缓存状态。

如果首页始终为 `REVALIDATED`：

1. 确认服务器已经返回 `Cloudflare-CDN-Cache-Control`。
2. 确认公开首页 Cache Rule 已启用并命中当前主机名。
3. 确认后置绕过规则没有误匹配 `/`。
4. 清理 Cloudflare 缓存后重试。

## 8. 用真实用户数据判断是否还要继续

启用 Cloudflare Web Analytics 后，观察：

- Country = China
- 移动端
- P75 LCP
- P75 INP
- 首页与关键路径的变化

Cloudflare Web Analytics 支持按国家、浏览器、系统和 URL 查看 Core Web Vitals，不需要自己保存或识别用户 IP。参见 [Core Web Vitals 文档](https://developers.cloudflare.com/web-analytics/data-metrics/core-web-vitals/)。

至少观察一周再决定是否追加付费能力。

## 9. 什么时候考虑 Argo 或更换线路

只有在以下情况才试用 Argo：

- 静态资源已稳定 `HIT`。
- 首页 HTML 已能在边缘命中。
- 慢点主要集中在未缓存 API 或边缘回源。
- 源站 TTFB 或跨洲回源耗时明显。

Argo 优化 Cloudflare 数据中心到源站的路径，不解决中国大陆用户到 Cloudflare 境外边缘的最后一公里。它需要绑定付款方式并按量计费，说明见 [Argo Smart Routing 文档](https://developers.cloudflare.com/argo-smart-routing/get-started/)。

如果完成本清单后，中国大陆用户仍普遍出现高延迟或丢包，问题属于跨境链路。普通小黄云没有免费设置可以从根本上解决。产生质变的方案只有：

- ICP 备案后使用大陆 CDN。
- 购买 Cloudflare Enterprise 和单独的 China Network 服务。
- 将源站/备用入口放在面向大陆优化的香港线路，并根据实际监控评估。

Cloudflare China Network 是 Enterprise 的单独订阅，并要求有效 ICP，参见 [China Network 概览](https://developers.cloudflare.com/china-network/) 与 [接入要求](https://developers.cloudflare.com/china-network/faq/)。

## 10. 回滚

若出现旧页面、静态资源 404 或登录流程异常：

1. 禁用 `Cache public app shell` 规则。
2. 将 HTML 恢复为 `Cache-Control: no-cache`，移除 `Cloudflare-CDN-Cache-Control`。
3. 执行 `Purge Everything`。
4. 保留 API/管理端绕过规则与 `/assets/*` immutable 缓存。

该回滚不会影响域名解析、小黄云代理或服务器本身。
