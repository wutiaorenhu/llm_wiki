---
title: "AI 智能体 (AI Agent)"
type: concept
sources:
  - raw/000-AI大模型/021-Claude-Cowork开启AI智能体时代.md
  - raw/000-AI大模型/045-AI-Agent成热门趋势.md
  - raw/000-AI大模型/032-MCP与Agent-Skills演进逻辑.md
  - raw/000-AI大模型/028-2025年AI智能体发展变革.md
related:
  - "[[ai-alignment]]"
  - "[[cognitive-core]]"
  - "[[scalable-oversight]]"
created: 2026-06-15
updated: 2026-06-15
confidence: high
---

# AI 智能体 (AI Agent)

AI Agent 是从"对话工具"向"自主执行体"的范式转移。2025 年被定义为"AI Agent 元年"。

## 核心定义

AI Agent 是能自主**感知环境、制定计划、执行任务、验证结果**的 AI 系统。区别于传统聊天机器人，Agent 具备：
- 任务分解与规划
- 工具调用（API、文件系统、浏览器）
- 多步推理与自我纠错
- 跨系统工作流整合

## 关键技术组件

1. **自主代理循环 (Agentic Loop)** — 任务分解 → 并行子任务 → 验证循环 → 自动重试
2. **模型上下文协议 (MCP)** — Anthropic 提出的开放协议，连接外部工具（Google Drive、Slack、GitHub）
3. **安全沙箱** — 虚拟机隔离 + 进程权限限制 + 网络白名单
4. **上下文压缩** — 长任务自动总结，避免上下文溢出

## 代表性产品

- **Claude Cowork (Anthropic)** — 桌面端 Agent，直接操作文件系统，跨应用工作流
- **OpenAI Operator** — 浏览器端 Agent，视觉模拟点击图形界面
- **Claude Code** — 开发工具 Agent，代码生成、测试、部署全流程

## 产业影响

- 人类角色从"执行者"变为"目标定义者"和"结果审核者"
- 威胁垂直 SaaS 工具，"套壳型"创业公司生存空间被挤压
- 生态护城河从 API 转向运行环境（Harness）控制

## 安全风险

- **误操作风险**：模糊指令导致文件删除等不可逆操作
- **提示词注入**：恶意网页劫持 Agent 行为
- **隐私边界**：系统级权限访问敏感数据
