# 《镜界自白（InnerEcho）》- 多章节填空自白档案系统需求文档 (最新LLM版)

> 🔮 **核心架构**：“前端结构化手填 ➔ 后端 LLM 大模型 JSON 智能分析 ➔ 格式化海报卡片”。

---

## 🎯 一、 大模型 (LLM) JSON 接口与字段设计

后端 `/api/analyze-dossier` 接口接收用户提交的全套自白数据，大模型分析后返回如下**标准 JSON 结构**：

```json
{
  "credibilityScore": 85, 
  "credibilityLevel": "high", 
  "archetypeTitle": "暗夜破局者",
  "personaDeconstruction": "作为一名在日常社会中担任【钢琴教师】的女性（25岁），你在人群中展现出‘温婉端庄’的稳定特质...",
  "shadowDeconstruction": "在潜意识视角下，你的阴影呈现出强烈的反差——你真正渴望‘打破枷锁与被动服从’...",
  "psychologicalSublimation": "不必为反差渴望感到困惑。外在的规矩与内在的失控是心理能量的相互补偿，接纳它能让灵魂获得升华。",
  "resonanceKeywords": ["反差觉醒", "角色倒错", "深层羁绊", "心理补偿"]
}
```

### 🔒 字段说明与隐藏规则：
1. **`credibilityScore` & `credibilityLevel` (可信度评估 - 内部专用)**：
   - 大模型根据用户的输入内容（识别是否为乱打字如 `asdfgh`、重复数字 `111` 或前后严重矛盾敷衍）评估真实性（0~100）。
   - ⚠️ **该字段仅留存在后端/数据日志中，绝对不展示给前端普通用户看！**
2. **`personaDeconstruction` (人格面具解构)**：展示在海报上。
3. **`shadowDeconstruction` (潜意识阴影解构)**：展示在海报上。
4. **`psychologicalSublimation` (心理升华与建议)**：展示在海报上。
5. **`archetypeTitle` & `resonanceKeywords`**：展示在海报上。

---

## 🧩 二、 核心章节划分

```
[ 章节一: 基础表里自白 ] ➔ [ 章节二: 主题深度探索 ] ➔ [ 章节三: 剧情沉浸法则 ] ➔ [ LLM 接口解析 ] ➔ [ 章节四: 卷宗海报 ]
```
