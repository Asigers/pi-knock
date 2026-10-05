# pi-knock

[![npm 版本](https://img.shields.io/npm/v/%40asigers%2Fpi-knock)](https://www.npmjs.com/package/@asigers/pi-knock)
[![CI](https://github.com/Asigers/pi-knock/actions/workflows/ci.yml/badge.svg)](https://github.com/Asigers/pi-knock/actions/workflows/ci.yml)
[![Pi 0.87+](https://img.shields.io/badge/Pi-0.87%2B-blue)](https://www.npmjs.com/package/@earendil-works/pi-coding-agent)
[![MIT 许可证](https://img.shields.io/badge/license-MIT-green)](../LICENSE)

[English](../README.md) | 简体中文

**离开终端。Pi 需要你的时候会来找你。**

pi-knock 是一个 Pi coding agent 扩展，会在任务**完成、失败或需要你输入**时发送远程通知。可以通过 Pushover 推送到 iPhone / Apple Watch，通过 ntfy 使用托管或自建推送，也可以通过 Webhook 接入自己的自动化服务。

<p align="center">
  <img src="https://raw.githubusercontent.com/Asigers/pi-knock/main/docs/assets/pi-knock-demo.gif" alt="pi-knock 宣传演示：让 Pi 继续工作，在需要你时接收远程通知" width="960">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Asigers/pi-knock/main/docs/assets/notification-preview.svg" alt="pi-knock 手机通知示例" width="720">
</p>

## 为什么需要 pi-knock？

桌面通知只有人在电脑旁时才有用。pi-knock 让你把任务交给 Pi 后真正离开终端：当任务完成，或 Pi 需要你输入和确认时，通知会直接到达手机或手表。

- **Pi 真正结束后再提醒** — 自动重试和排队任务都处理完、进入 settled 状态后才发送完成通知。
- **只在需要你时回来** — Pi 等待输入或确认时主动通知你，不必反复查看终端。
- **离开电脑也能收到** — 可通过 Pushover、ntfy 或自己的 Webhook 自动化接收提醒。

## 目录

- [为什么需要 pi-knock？](#为什么需要-pi-knock)
- [功能特点](#功能特点)
- [快速开始](#快速开始)
- [命令](#命令)
- [通知渠道](#通知渠道)
- [通知规则](#通知规则)
- [配置](#配置)
- [更新与卸载](#更新与卸载)
- [开发](#开发)
- [相关文档](#相关文档)
- [许可证](#许可证)

## 功能特点

- **真正完成后再提醒** — 使用 `agent_settled`，Pi 的自动重试和排队任务都结束后才发送完成通知。
- **人可以离开电脑** — 通知发到手机或手表，而不是只在当前终端弹一下。
- **投递更可靠** — 瞬时网络错误会自动重试。
- **默认保护锁屏隐私** — 默认不把原始 Prompt 放进通知正文，需要时可主动开启。
- **识别 Session** — 如果给 Pi Session 设置了名称，会显示在通知标题里。
- **不需要自建推送服务** — pi-knock 直接调用你配置的通知渠道。

## 快速开始

**环境要求：** Pi 0.87+、Node.js 22.19+。

### 1. 安装

推荐从 npm 安装：

```bash
pi install npm:@asigers/pi-knock
```

请只选择**一种**安装来源。不要同时安装 npm 版和 Git 版，否则 Pi 可能会加载两份扩展并发送重复通知。

如果需要测试未发布源码，可以使用带版本标签的 Git 版：

```bash
pi install git:github.com/Asigers/pi-knock@v0.3.2
```

不确定是否重复安装时，运行 `pi list`，只保留一个 `pi-knock` 条目。

### 2. 配置

重启 Pi 或执行 `/reload`，然后启动配置向导：

```text
/knock setup
```

选择通知渠道并填写配置。保存渠道配置后，会立即发送测试通知。

> **凭据隐私：** Pi 的标准输入框不会隐藏输入内容。请只在私有终端或私有会话中填写凭据。

### 3. 验证

需要检查通知是否正常时，发送一条测试通知：

```text
/knock test
```

如果没有收到通知，运行 `/knock doctor` 查看渠道配置和最近一次投递结果。

## 命令

在 Pi 内运行以下命令：

| 命令 | 作用 |
| --- | --- |
| `/knock setup` | 配置通知渠道和通知偏好 |
| `/knock status` | 查看当前配置 |
| `/knock test` | 发送实时测试通知 |
| `/knock doctor` | 查看渠道和最近一次投递诊断 |

## 通知渠道

| 渠道 | 适合场景 |
| --- | --- |
| **Pushover** | iPhone / Apple Watch |
| **ntfy** | 托管或自建推送 |
| **Webhook** | 自己的服务和自动化流程 |

需要配置渠道时，可以查看 [英文渠道配置指南](./providers.md) 或 **[Pushover 完整配置指南](./pushover-setup.zh-CN.md)**。

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

对于请求超时、瞬时网络错误以及 HTTP 429 / 5xx 等可重试错误，pi-knock 最多尝试 3 次（首次发送 + 2 次重试）；永久性的 4xx 错误不会无意义重试。

Pushover 单次请求最多等待 10 秒，两次重试前默认等待 5 秒和 10 秒。ntfy 和 Webhook 保持单次 5 秒超时，重试前默认等待 1 秒和 3 秒。实际等待会加入少量随机抖动，并会遵守服务端返回的 `Retry-After`（最多 60 秒）。

投递失败保持静默：自动通知、`/knock test` 和配置向导中的测试都不会弹出失败警告或打印错误，测试反馈只显示成功的渠道。生命周期通知会在后台投递，不会因为重试阻塞 Pi 的 settled 边界。需要排查时，主动运行 `/knock doctor` 查看失败原因和尝试次数。最近一次报告会保存在本地，不包含通知正文或凭据。

请求超时不代表服务端没有接收到消息，因此重试偶尔可能产生重复通知。

## 配置

### 配置文件

配置向导默认写入以下两个文件：

```text
~/.pi/agent/pi-knock/
├── config.json
├── credentials.json
└── last-delivery.json
```

- `config.json`：保存通知偏好和不含密钥的渠道设置。
- `credentials.json`：单独保存渠道密钥和令牌，请勿提交到仓库或分享文件内容。
- `last-delivery.json`：保存最近一次脱敏后的投递状态和尝试次数，供 `/knock doctor` 查看。

可以通过 `PI_KNOCK_HOME` 修改默认目录，也可以通过 `PI_KNOCK_CONFIG` 和 `PI_KNOCK_CREDENTIALS` 分别指定文件路径。

### 配置示例

启用 Pushover 的最小 `config.json` 示例（凭据需单独配置）：

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

完整配置见 [`pi-knock.example.json`](../pi-knock.example.json) 和 [`config.schema.json`](../config.schema.json)。

### 环境变量

环境变量会覆盖配置文件中的对应设置，适合 Pi-Web、容器、CI 和外部密钥管理工具。常用变量如下：

| 用途 | 变量 |
| --- | --- |
| Pushover 凭据 | `PI_KNOCK_PUSHOVER_USER_KEY`、`PI_KNOCK_PUSHOVER_APP_TOKEN` |
| ntfy 连接 | `PI_KNOCK_NTFY_SERVER`、`PI_KNOCK_NTFY_TOPIC`、`PI_KNOCK_NTFY_ACCESS_TOKEN` |
| Webhook 连接 | `PI_KNOCK_WEBHOOK_URL`、`PI_KNOCK_WEBHOOK_BEARER` |
| 投递报告路径 | `PI_KNOCK_DELIVERY_REPORT`（可选） |
| 通知内容 | `PI_KNOCK_CONTENT_MODE`（`project-only` 或 `prompt`） |

## 更新与卸载

更新已安装的扩展：

```bash
pi update --extensions
```

卸载通过 npm 安装的版本：

```bash
pi remove npm:@asigers/pi-knock
```

如果通过 GitHub 安装，请改用 `pi remove git:github.com/Asigers/pi-knock`。

## 开发

```bash
npm ci --ignore-scripts
npm run check
npm pack --dry-run
pi -ne -e ./src/index.ts
```

本地测试时使用 `-ne`，可以避免同时加载已经安装的 pi-knock，防止重复通知。

## 相关文档

- [英文渠道配置指南](./providers.md)
- [Pushover 完整配置指南](./pushover-setup.zh-CN.md)
- [配置示例](../pi-knock.example.json)与 [JSON Schema](../config.schema.json)
- [更新记录](../CHANGELOG.md)
- [安全说明](../SECURITY.md)
- [贡献指南](../CONTRIBUTING.md)
- [行为准则](../CODE_OF_CONDUCT.md)
- [反馈问题](https://github.com/Asigers/pi-knock/issues)

## 许可证

[MIT](../LICENSE)
