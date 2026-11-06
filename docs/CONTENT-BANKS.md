# 题库内容与仓库分离（content/）

题库正文不再提交到 git：仓库只放代码，10 套内置题库以 JSON 形式存放在本机（以及需要构建的机器）的 `content/` 目录里，构建前由脚本生成代码。

## 为什么这样做

1. 题库是产品内容而不是代码，改动频率和审查方式都和代码不同；
2. 内容不进仓库，仓库体积与 diff 噪声都明显下降（原先前端 + 服务端各存一份，共约 450 KB）；
3. 生成物与手写代码分离，避免再出现「前端改了一套、服务端 preset 忘了同步」这类漂移。

## 目录结构

```text
content/                         # 不在 git 里（.gitignore）
  display-rules.json             # 选择器展示顺序（rank + 标题兜底签名）
  banks/<bankId>.json            # 每套题库一份，见下
  banks/_expectations.json       # 内容级断言（原单元测试里的约束）
```

单个题库 JSON：

```jsonc
{
  "id": "normal_insulation_18",
  "card": { /* 选择器卡片文案；与题库本体可不同（standard_bdsm_50 就是如此） */ },
  "bank": { /* 题库本体：title/category/dimensions/questions… */ },
  "listedInSelector": true,
  "displayRank": 35,
  "isPublished": true,
  "createdAt": "…",
  "updatedAt": "…"
}
```

`card` 与 `bank` 分开存是必要的：`standard_bdsm_50` 的卡片标题/维度与题库本体并不一致，合并会让 UI 标题回退。

## 生成物（都不进 git）

| 路径 | 内容 |
| --- | --- |
| `src/data/questionBanks/generated/<bank>.ts` | 每套题库一个模块，导出 `QuestionBankDefinition` |
| `src/data/questionBanks/generated/index.ts` | `ALL_BANK_METADATA`、`BANK_IMPORTERS`、`BANK_DISPLAY_RULES` |
| `server/data/generated/presets.ts` | 服务端 `PRESET_BANKS_DATA`（后台「内置题库」只读来源） |

手写代码只保留行为层：`src/data/questionBanks/bankRegistry.ts`（排序、按 id 查元数据）与 `server/presetBanks.ts`（摘要/详情读取）。

## 命令

```bash
npm run gen:banks        # content/ → generated/（predev / prebuild / pretest 自动执行）
npm run validate:banks   # 校验内容：id、题目 id 唯一、选项、维度、_expectations.json 断言
```

`gen:banks` 在找不到 `content/` 时会直接报错退出，不会静默生成空题库。

## 内容丢了怎么恢复

`content/` 只存在于本机和服务器：

- 本机：`E:\modules\projects\InnerEcho\content\`
- 服务器：`/var/www/innerecho/content/`（部署包只含 `dist-server`，内容已编译进产物；但若要在服务器上重新构建，就需要这一份）

恢复后跑 `npm run gen:banks && npm run validate:banks` 即可。`_expectations.json` 里是内容级约束（题数、维度顺序、安全基线选项等），题库改版要同步更新它。

## 部署

部署时在本机构建（`npm run build` 触发 `prebuild` → `gen:banks`），只把 `dist-server` 打包上传，**不需要把 content/ 传到服务器**。构建机必须有 `content/`。部署脚本由运营方单独维护（不在本仓库内）。

## 尚未搬出仓库的内容

- `public/articles/*.html`（8 篇长文，约 63 KB）
- `server/defaultPromptTemplate.ts`、`src/data/personaOptions.ts` 等提示词/人设文案
- `scripts/data/pca-code.json`（公开行政区划数据，不属于产品内容）

如需继续拆分，沿用同一模式：内容放 `content/`，构建期生成，生成物进 `.gitignore`。
