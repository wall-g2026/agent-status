# OpenClaw 运维档案

> 更新时间: 2026-02-28

## 1. 系统概述

| 项目 | 值 |
|------|-----|
| 版本 | 2026.2.26 |
| OS | macOS 26.3 (arm64) |
| Node | v25.6.1 |
| Dashboard | http://127.0.0.1:18789/ |
| Gateway | local · ws://127.0.0.1:18789 |
| 认证方式 | Token |

## 2. 已配置 Agent

| Agent ID | 名称 | 工作区 | 模型 |
|----------|------|--------|------|
| main | main | ~/.openclaw/workspace | MiniMax-M2.5 |
| wall-c | WALL-C | ~/.openclaw/agents/wall-c | MiniMax-M2.5 |
| wall-e | wall-e | ~/.openclaw/agents/wall-e | MiniMax-M2.-r | wall-r | ~/.openclaw/agents/wall5 |
| wall-r | MiniMax-M2.5 |

## 3. 频道配置

### Feishu (已启用)

| Account | App ID | Bot Name |
|---------|--------|----------|
| main | cli_a9156da38438dcb0 | WALL-G |
| wall-c | cli_a92b822ac4611cef | WALL-C |
| wall-e | cli_a92bf9a0bc795ced | WALL-E |
| wall-r | cli_a92b2cf462381cda | WALL-R |

### Discord (已禁用)

## 4. 已安装 Skills

### 全局 Skills (51个)
- 1password, apple-notes, apple-reminders, bear-notes, blogwatcher
- blucli, bluebubbles, camsnap, canvas, clawhub
- coding-agent, discord, eightctl, gemini, gh-issues
- gifgrep, github, gog, goplaces, healthcheck
- himalaya, imsg, mcporter, model-usage, nano-banana-pro
- nano-pdf, notion, obsidian, openai-image-gen, openai-whisper
- openai-whisper-api, openhue, oracle, ordercli, peekaboo
- sag, session-logs, sherpa-onnx-tts, skill-creator, slack
- songsee, sonoscli, spotify-player, summarize, things-mac
- tmux, trello, video-frames, voice-call, wacli, weather, xurl

### Feishu 扩展 (4个)
- feishu-doc, feishu-drive, feishu-perm, feishu-wiki

## 5. 定时任务 (Cron)

当前无定时任务配置。

## 6. 安全审计 ⚠️

### 严重问题 (6个)
1. **Open groupPolicy** - Discord 和 Feishu 的 groupPolicy 设为 "open"
2. **Feishu 安全警告** - 4个账户均存在 groupPolicy="open" 风险

### 建议修复
```bash
# 修改 groupPolicy 为 allowlist
openclaw config set channels.feishu.groupPolicy "allowlist"
openclaw config set channels.discord.groupPolicy "allowlist"
```

## 7. 服务状态

| 服务 | 状态 | PID |
|------|------|-----|
| Gateway | running | 69663 |
| Node | 未安装 | - |

## 8. 快速命令

```bash
# 查看状态
openclaw status

# 查看日志
openclaw logs --follow

# 安全审计
openclaw security audit

# 深度检测
openclaw security audit --deep

# 重启 Gateway
openclaw gateway restart
```

## 9. 目录结构

```
~/.openclaw/
├── agents/          # Agent 工作区
├── browser/         # 浏览器配置
├── canvas/          # Canvas 数据
├── credentials/     # 凭据存储
├── cron/            # 定时任务
├── delivery-queue/  # 消息队列
├── devices/         # 设备配置
├── feishu/          # Feishu 数据
├── identity/        # 身份配置
├── logs/            # 日志文件
├── media/           # 媒体文件
├── memory/          # 记忆存储
├── openclaw.json    # 主配置文件
└── workspace/       # 默认工作区
```

---
*此档案由 WALL-C 自动生成*
