# pi-knock

[English](./README.md) | 简体中文

**离开终端。Pi 需要你的时候会来找你。**

pi-knock 会在 Pi 任务**完成、失败或需要你输入**时发送远程通知。可以通过 Pushover 推送到 iPhone / Apple Watch，通过 ntfy 使用托管或自建推送，也可以通过 Webhook 接入自己的自动化服务。

```bash
pi install npm:@asigers/pi-knock
```

## 为什么用 pi-knock

- **真正完成后再提醒** — 使用 `agent_settled`，Pi 的自动重试和排队任务都结束后才发送完成通知。
- **人可以离开电脑** — 通知发到手机或手表，而不是只在当前终端弹一下。
- **投递更可靠** — 瞬时网络错误会自动重试。
- **默认保护锁屏隐私** — 默认不把原始 Prompt 放进通知正文，需要时可主动开启。
- **识别 Session** — 如果给 Pi Session 设置了名称，会显示在通知标题里。
- **不需要自建推送服务** — pi-knock 直接调用你配置的通知渠道。

## 快速开始

安装后重启 Pi，或执行 `/reload`，然后运行：

```text
/knock setup
```

选择通知渠道并填写配置。保存后会立即发送测试通知。

| 命令 | 作用 |
| --- | --- |
| `/knock setup` | 配置通知渠道和通知偏好 |
| `/knock status` | 查看当前配置 |
| `/knock test` | 发送实时测试通知 |
| `/knock doctor` | 查看渠道和最近一次投递诊断 |

要求 **Pi 0.87+**。

## 通知渠道

| 渠道 | 适合场景 |
| --- | --- |
| **Pushover** | iPhone / Apple Watch |
| **ntfy** | 托管或自建推送 |
| **Webhook** | 自己的服务和自动化流程 |

第一次使用 Pushover？查看 **[Pushover 完整配置指南](./docs/pushover-setup.zh-CN.md)**。

## 通知规则

默认行为：

| 事件 | 是否通知 |
| --- | --- |
| 对话完成 | 是 |
| 等待输入 / 确认 | 是 |
| 对话失败 | 是 |
| 对话中止 | 否 |

通知标题会包含项目名；如果当前 Pi Session 设置了名称，也会一起显示。

为了避免敏感 Prompt 出现在手机或手表锁屏上，默认使用 **project-only** 模式，不发送原始 Prompt。需要显示 Prompt 时，执行 `/knock setup`，选择 **Notification preferences** 修改。

对于瞬时网络错误以及 HTTP 429 / 5xx 等可重试错误，pi-knock 最多尝试 3 次；永久性的 4xx 错误不会无意义重试。可以用 `/knock doctor` 查看最近一次投递结果和尝试次数。

## 配置

默认目录：

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
  "contentMode": "project-only",
  "notify": {
    "completed": true,
    "error": true,
    "aborted": false,
    "input": true
  },
  "pushover": {
    "enabled": true
  }
}
```

完整配置见 [`pi-knock.example.json`](./pi-knock.example.json) 和 [`config.schema.json`](./config.schema.json)。

同时支持环境变量，适合 Pi-Web、容器、CI 和外部密钥管理工具。

> Pi 当前的标准输入框不会隐藏输入内容。填写凭据时，请只在私有终端或私有会话中执行 `/knock setup`。

## 从 GitHub 安装

安装 `main` 最新版本：

```bash
pi install git:github.com/Asigers/pi-knock
```

更新：

```bash
pi update --extensions
```

卸载：

```bash
pi remove npm:@asigers/pi-knock
```

## 开发

```bash
npm ci --ignore-scripts
npm run check
npm pack --dry-run
pi -ne -e ./src/index.ts
```

本地测试时使用 `-ne`，可以避免同时加载已经安装的 pi-knock，防止重复通知。

## 更多

- [更新记录](./CHANGELOG.md)
- [安全说明](./SECURITY.md)
- [贡献指南](./CONTRIBUTING.md)

## License

MIT
