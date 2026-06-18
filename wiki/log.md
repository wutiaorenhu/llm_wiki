# 操作日志

> 追加式日志。记录每次 ingest、query（有价值时）、lint 操作及其结果。新条目追加在末尾。

---

## [2025-05-30] init | Wiki 初始化

- 创建目录结构和 CLAUDE.md 配置文件
- 初始化 index.md 和 log.md

---

## [2025-05-30] ingest | Anthropic AI 安全核心观点

- 来源：Anthropic 官方博客文章（中文翻译版 PDF）
- 创建来源摘要：[[anthropic-core-views-on-ai-safety]]
- 创建概念页：[[ai-alignment]]、[[mechanistic-interpretability]]、[[scalable-oversight]]
- 创建实体页：[[anthropic]]
- 级联更新：4 个概念/实体页建立了交叉引用
- 索引已更新

---

## [2025-05-30] ingest | Dwarkesh 访谈 Andrej Karpathy：AGI 仍需十年

- 来源：Dwarkesh Patel 播客文字稿
- 创建来源摘要：[[dwarkesh-karpathy-interview]]
- 创建实体页：[[andrej-karpathy]]
- 创建概念页：[[cognitive-core]]、[[process-vs-outcome-supervision]]、[[model-collapse]]
- 级联更新：与已有 AI 对齐相关页面建立了交叉引用（过程监督 ↔ Anthropic 过程导向学习、认知核心 ↔ 机械可解释性）
- 索引已更新

---

## [2025-06-01] ingest | AI 裁员陷阱 (Falk & Tsoukalas, 2026)

- 来源：arXiv 经济学论文 + Forrester Predictions 2026 实证数据
- PDF 无法直接解析，通过 WebFetch 和 WebSearch 获取内容
- 创建来源摘要：[[ai-layoff-trap]]
- 创建概念页：[[ai-layoff-trap]]（需求外部性、协调失败、Pigouvian 税）
- 级联更新：[[ai-alignment]]、[[Anthropic]]、[[Andrej Karpathy]] 添加交叉引用
- 索引已更新

---

## [2026-06-15] ingest | 元宝对话历史全量摄入

- 来源：腾讯元宝 (yuanbao.tencent.com)，通过 Playwright + API 自动提取
- 总计 430 篇对话，按 15 个项目/分组归档到 `raw/` 目录
- 创建 15 篇来源摘要页：
  - [[yuanbao-ai-models]] (83 篇) — AI 大模型技术探索
  - [[yuanbao-chen-family]] (54 篇) — 个人生活对话
  - [[yuanbao-intelligence-computation]] (9 篇) — 智能与计算理论
  - [[yuanbao-philosophy-psychology]] (39 篇) — 哲学与心理探索
  - [[yuanbao-culture-creation]] (15 篇) — 文化与内容创作
  - [[yuanbao-reading-learning]] (15 篇) — 阅读与学习探索
  - [[yuanbao-economy-investment]] (29 篇) — 经济与投资分析
  - [[yuanbao-music-film-literature]] (25 篇) — 音乐电影文学赏析
  - [[yuanbao-science-technology]] (6 篇) — 科学与技术前沿
  - [[yuanbao-communication-management]] (14 篇) — 表达与管理实践
  - [[yuanbao-history-law]] (5 篇) — 历史与法律
  - [[yuanbao-work-thinking]] (7 篇) — 工作与思考
  - [[yuanbao-gaming-other]] (4 篇) — 游戏与其他
  - [[yuanbao-diet-health]] (87 篇) — 饮食与健康
  - [[yuanbao-sports-travel]] (38 篇) — 生活运动旅行
- 创建 3 篇概念页：[[ai-agent]]、[[world-model]]、[[rag]]
- 级联更新：索引新增 18 个条目（15 来源 + 3 概念）
- 提取方式：Playwright 自动化浏览器 + 元宝 API (POST /api/user/agent/conversation/v3/list, /v1/detail)

---

## [2026-06-15] enhance | 元宝对话来源摘要页全面完善

- 对 15 篇来源摘要页进行深度内容扩充：
  - 新增创建 10 页：[[yuanbao-ai-models]]、[[yuanbao-intelligence-computation]]、[[yuanbao-chen-family]]、[[yuanbao-philosophy-psychology]]、[[yuanbao-culture-creation]]、[[yuanbao-economy-investment]]、[[yuanbao-reading-learning]]、[[yuanbao-music-film-literature]]、[[yuanbao-science-technology]]、[[yuanbao-sports-travel]]
  - 增强完善 5 页：[[yuanbao-communication-management]]、[[yuanbao-diet-health]]、[[yuanbao-gaming-other]]、[[yuanbao-history-law]]、[[yuanbao-work-thinking]]
- 每页增加：核心主题分类、关键特点/脉络分析、与现有 Wiki 关联、完整对话列表
- 读取各项目目录中的代表性对话（共约 30 篇）以确认内容主题
- 建立与现有概念页的交叉引用（[[认知核心]]、[[AI 对齐]]、[[AI 裁员陷阱]] 等）
- 索引已包含全部 15 条来源摘要条目

---

## [2026-06-15] enhance | 人文领域概念页补充

- 补充创建 4 篇人文/心理领域概念页：
  - [[pregnancy-support]] — 孕期支持：约 64% 女性孕期有情绪问题，涵盖激素机制、配偶支持策略（情绪容器 vs 解决方案）、医疗决策
  - [[intimate-relationships]] — 亲密关系：心理摆效应、互赖模式、关系评估框架、沟通暴力修复
  - [[emotion-regulation]] — 情绪管理：杏仁核劫持的神经机制、压力蓄水池模型、三步自我反思法
  - [[flow]] — 心流：Csikszentmihalyi 理论、神经生物学基础、挑战-技能平衡、触发条件
- 来源覆盖 `raw/000-陈大傻陈小胖/`、`raw/001-哲学与心理/`、`raw/003-饮食与健康/`
- 建立跨域交叉引用：孕期支持 ↔ 亲密关系 ↔ 情绪管理 ↔ 心流
- 索引已更新
