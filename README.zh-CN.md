# pi-knock

[English](./README.md) | 简体中文

**Pi 任务完成、失败或需要你操作时，自动给你发通知。**

pi-knock 是一个轻量级 Pi 扩展，支持通过 **Pushover**、**ntfy** 或 **Webhook** 推送通知。Pi 在后台运行时，你不需要一直盯着终端等结果。

## 功能

- ✅ 对话完成时通知
- ❓ Pi 等待输入或确认时通知
- ❌ 任务失败时通知
- ⏹️ 可选：任务中止时通知
- 📱 支持 Pushover、ntfy、通用 Webhook
- ⌚ 可通过 iPhone 通知镜像推送到 Apple Watch
- 🔗 可附带 Pi-Web 会话地址
- 🔐 配置和凭据分离存储

## 安装

推荐使用 npm：

```bash
pi install npm:@asigers/pi-knock
```

也可以直接从 GitHub 安装：

```bash
pi install git:github.com/Asigers/pi-knock
```

安装后重启 Pi，或执行：

```text
/reload
```

要求 **Pi 0.87+**。

## 快速开始

执行：

```text
/knock setup
```

选择通知渠道并填写配置。保存后，pi-knock 会自动发送一条测试通知。

常用命令：

| 命令 | 作用 |
| --- | --- |
| `/knock setup` | 配置通知渠道 |
| `/knock status` | 查看当前配置 |
| `/knock test` | 发送测试通知 |

## 通知渠道

| 渠道 | 适合场景 |
| --- | --- |
| **Pushover** | iPhone / Apple Watch |
| **ntfy** | 简单的托管或自建推送 |
| **Webhook** | 接入自己的服务或自动化流程 |

如果需要 Apple Watch 通知，在 iPhone 安装 Pushover，并在 Watch App 中开启通知镜像即可。

## 通知规则

默认行为：

| 事件 | 是否通知 |
| --- | --- |
| 对话完成 | 是 |
| 等待输入 / 确认 | 是 |
| 对话失败 | 是 |
| 对话中止 | 否 |
| `/knock test` | 立即发送 |

完成通知在 Pi 进入 `agent_settled` 后发送，因此重试、排队任务等自动继续执行的情况不会提前触发“任务完成”。

完成通知默认包含：**项目名、简化后的原始提示词、执行耗时**。

## 配置

默认配置目录：

```text
~/.pi/agent/pi-knock/
├── config.json
└── credentials.json
```

示例：

```json
{
  "projectName": "",
  "openUrl": "",
  "notify": {
    "completed": true,
    "error": true,
    "aborted": false,
    "input": true
  },
  "ntfy": {
    "enabled": false,
    "server": "https://ntfy.sh",
    "topic": ""
  },
  "pushover": {
    "enabled": true
  },
  "webhook": {
    "enabled": false,
    "url": ""
  }
}
```

完整配置见 [`pi-knock.example.json`](./pi-knock.example.json) 和 [`config.schema.json`](./config.schema.json)。

同时支持环境变量配置，适合 Pi-Web、容器、CI 或外部密钥管理工具。

> Pi 的标准输入框不会隐藏凭据字符。请只在私有终端或私有会话中执行 `/knock setup`。

## 更新 / 卸载

更新：

```bash
pi update --extensions
```

卸载 npm 版本：

```bash
pi remove npm:@asigers/pi-knock
```

卸载 Git 版本：

```bash
pi remove git:github.com/Asigers/pi-knock
```

## 开发

```bash
npm ci --ignore-scripts
npm run check
pi -ne -e ./src/index.ts
```

本地测试时使用 `-ne`，可以避免同时加载已经安装的 pi-knock，防止重复通知。

## 更多

- [更新记录](./CHANGELOG.md)
- [安全说明](./SECURITY.md)
- [贡献指南](./CONTRIBUTING.md)

## License

MIT
