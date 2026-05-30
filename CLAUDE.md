# Research Wiki

## 项目结构

```
Wiki/
├── raw/           ← 不可变原始资料。绝不修改这里的文件。
│   ├── articles/  ← 网页文章、博客等
│   ├── papers/    ← 学术论文、PDF
│   └── images/    ← 图片、截图、图表
├── wiki/          ← LLM 生成和维护的 Markdown 页面。
│   ├── concepts/  ← 概念页（解释一个核心概念）
│   ├── entities/  ← 实体页（人、公司、工具、项目等）
│   ├── sources/   ← 来源摘要（每个 raw/ 文件对应一页）
│   ├── comparisons/ ← 对比页（A vs B 分析）
│   ├── index.md   ← 主目录。每次操作后更新。
│   └── log.md     ← 追加式操作日志。
├── outputs/       ← 生成的报告、演示、lint 结果。
├── CLAUDE.md      ← 本文件。
└── .gitignore
```

## 页面规范

每个 wiki 页面必须包含 YAML frontmatter：

```yaml
---
title: "页面标题"
type: concept | entity | source-summary | comparison
sources:
  - raw/articles/filename.md
related:
  - "[[相关概念]]"
created: YYYY-MM-DD
updated: YYYY-MM-DD
confidence: high | medium | low
---
```

### 命名约定
- 文件名：英文 kebab-case（如 `attention-mechanism.md`）
- 页面标题（title 字段）：使用中文（如 "注意力机制"）
- 内部引用：统一使用 `[[wikilink]]` 格式

### 引用规则
- 每个声明都应有来源链接，追溯到 `raw/` 中的文件
- 概念之间的关联用 `[[wikilink]]` 交叉引用
- 来源摘要页必须包含原始文件的完整路径

## 工作流

### Ingest（摄入）

当用户要求摄入新资料时，严格按以下步骤执行：

1. **读取** — 读取 `raw/` 中的源文件
2. **讨论** — 和用户讨论关键要点和值得提取的内容
3. **创建来源摘要** — 在 `wiki/sources/[source-name].md` 创建摘要页，包含：
   - 核心论点（3-5 条）
   - 关键事实和数据
   - 与其他概念/来源的关联
4. **级联更新** — 检查并更新相关概念页、实体页，添加新信息和交叉引用
5. **创建新页面** — 如果出现了新概念或实体，创建对应页面
6. **更新索引** — 更新 `wiki/index.md`，添加或更新条目
7. **记录日志** — 在 `wiki/log.md` 末尾追加操作记录

### Query（查询）

当用户提问时：

1. **定位** — 先读 `wiki/index.md`，识别相关页面
2. **研读** — 读取相关页面内容
3. **综合** — 综合信息，用 `[[wikilink]]` 标注来源
4. **提议存档** — 如果答案有价值且新颖，询问是否保存为新 wiki 页面

### Lint（健康检查）

定期或按需执行，扫描以下问题：

1. **矛盾** — 不同页面对同一主题的声明是否冲突
2. **孤立页面** — 是否有页面没有任何入链
3. **缺失概念** — 是否有被引用但未创建的页面
4. **过时声明** — 是否有被更新资料覆盖的旧信息
5. **数据缺口** — 是否有论点缺乏数据支撑
6. **交叉引用缺失** — 相关的概念是否缺少互链

结果保存到 `outputs/lint-YYYY-MM-DD.md`。

## 重要原则

- `raw/` 是**不可变的**。只读不写。
- 每个声明都可追溯到 `raw/` 来源。
- index.md 是导航中枢，始终保持更新。
- log.md 记录每次操作，不修改已有条目，只追加。
- 优先简洁——页面不必长篇大论，结构化短内容胜过冗长的散文。
