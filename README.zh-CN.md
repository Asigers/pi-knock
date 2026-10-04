# pi-knock

[English](./README.md) | 简体中文

**不用再一直盯着 Pi agent 等它干完。**

当 Pi 的一次对话完成、失败，或暂停并等待你输入时，pi-knock 会向你的手机、Apple Watch 或 Webhook 发送通知。

> Pi 安静地工作，需要你时再敲门。

## 功能

- ✅ **每次对话完成都通知** — 在 `agent_settled` 后发送一次通知
- ❓ **需要你处理时提醒** — Pi 打开阻塞式输入 / 确认 / 选择提示时立即通知
- ❌ **任务失败提醒** — 对话最终以错误状态结束时通知
- ⏹️ **任务中止提醒** — 可选，默认不通知 aborted 任务
- 📱 **支持 Pushover、ntfy 和通用 Webhook**
- ⌚ **支持 Apple Watch** — 通过 iPhone 通知镜像实现
- 🔗 **可附带会话 URL** — 搭配 Pi-Web 使用时很方便
- 🔐 **配置与凭据分离存储**
- 🧭 **交互式配置** — `/knock setup`、`/knock status`、`/knock test`

pi-knock 不运行自己的推送服务器，也不需要额外安装配套 App。

## 安装

### npm（推荐）

```bash
pi install npm:@asigers/pi-knock
```

### 稳定 Git Release

```bash
pi install git:github.com/Asigers/pi-knock@v0.2.1
```

### 安装 main 分支最新版本

```bash
pi install git:github.com/Asigers/pi-knock
```

安装后重启 Pi，或执行：

```text
/reload
```

### 不安装直接试用

```bash
pi -ne -e git:github.com/Asigers/pi-knock
```

## 更新与卸载

更新已经安装的 Pi 扩展包：

```bash
pi update --extensions
```

如果你使用类似 `@v0.2.1` 的 Git tag 安装，版本会固定在该 tag。需要升级时，请主动安装新的 tag。

卸载 Git 版本：

```bash
pi remove git:github.com/Asigers/pi-knock
```

卸载 npm 版本：

```bash
pi remove npm:@asigers/pi-knock
```

## 兼容性

当前支持基线为 **Pi 0.87+**。

Pi host packages 按照 Pi package 约定声明为 peer dependencies，由 Pi 本身提供，不会被打包进 pi-knock。

## 快速开始

运行：

```text
/knock setup
```

选择一个通知方式：

```text
Pushover (iPhone / Apple Watch)
ntfy
Webhook
```

保存后，pi-knock 会立即通过所选渠道发送一条测试通知。

查看当前配置：

```text
/knock status
```

随时发送测试通知：

```text
/knock test
```

## 什么时候会发送通知

一次正常对话的生命周期如下：

```text
用户发送提示词
   ↓
Pi 开始工作
   ↓
必要时进行重试 / 工具调用 / 上下文压缩 / 队列任务
   ↓
agent_settled
   ↓
发送一次完成通知
```

**没有最短执行时长限制。**

无论一次对话只运行 2 秒，还是运行 20 分钟，只要最终完成并启用了完成通知，就会发送一次提醒。

默认行为：

| 情况 | 默认行为 |
| --- | --- |
| 对话正常完成 | 通知 |
| 阻塞式输入 / 确认提示 | 立即通知 |
| 对话失败 | settled 后通知 |
| 对话被中止 | 默认静默，可配置 |
| `/knock test` | 立即发送 |

pi-knock 会屏蔽自身配置界面产生的输入事件，因此执行 `/knock setup` 不会误触发“需要输入”的提醒。

## 通知内容

完成通知完全使用本地、确定性数据生成，pi-knock **不会额外调用一次 LLM 来总结结果**。

默认格式：

```text
标题：
<项目名> · Task finished

正文：
<原始用户提示词> · <耗时>
```

例如：

```text
pi-knock · Task finished

Fix why completion notifications sometimes do not arrive · 1m 42s
```

项目名默认取当前工作目录名称，也可以通过 `projectName` 覆盖。

发送前，原始提示词会被压缩为较短的单行文本。

## Pushover → Apple Watch

如果你想用最简单的方式把通知推送到 Apple Watch：

1. 在 iPhone 上安装 **Pushover**。
2. 在 Watch App 中开启 Pushover 的通知镜像。
3. 创建一个 Pushover Application。
4. 获取你的 **User Key** 和 **Application API Token**。
5. 执行 `/knock setup`，选择 **Pushover (iPhone / Apple Watch)**。

pi-knock 使用明确的字段名保存这两个值：

```text
userKey
appToken
```

而不是含义容易混淆的 `user` / `token`。

> Pi 标准的 `ctx.ui.input()` 是普通文本输入框，并不是密码遮罩输入框。pi-knock 会在要求输入凭据前进行提示。请只在私有终端或私有会话中执行配置。

## 配置文件存储

推荐目录结构：

```text
~/.pi/agent/pi-knock/
├── config.json
└── credentials.json
```

### `config.json`

只保存普通行为配置和 endpoint 设置：

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

参考 [`pi-knock.example.json`](./pi-knock.example.json) 和 [`config.schema.json`](./config.schema.json)。

### `credentials.json`

只保存凭据：

```json
{
  "pushover": {
    "userKey": "...",
    "appToken": "..."
  }
}
```

在 POSIX 系统上，pi-knock 会以 `0600` 权限写入该文件。

**不要把这个文件提交到 Git 仓库。**

## 配置优先级

优先级从高到低：

```text
环境变量
   ↓
credentials.json
   ↓
config.json
   ↓
旧版 ~/.pi/agent/pi-knock.json
   ↓
默认值
```

环境变量非常适合 Pi-Web daemon、容器、CI 或外部 secret manager。

## 环境变量

### 通用

| 变量 | 用途 |
| --- | --- |
| `PI_KNOCK_HOME` | 覆盖 pi-knock 配置目录 |
| `PI_KNOCK_CONFIG` | 覆盖普通配置文件路径 |
| `PI_KNOCK_CREDENTIALS` | 覆盖凭据文件路径 |
| `PI_KNOCK_PROJECT` | 覆盖项目名 |
| `PI_KNOCK_OPEN_URL` | 支持的通知中打开的 URL |
| `PI_KNOCK_NOTIFY_COMPLETED` | 启用 / 禁用完成通知 |
| `PI_KNOCK_NOTIFY_ERROR` | 启用 / 禁用失败通知 |
| `PI_KNOCK_NOTIFY_ABORTED` | 启用 / 禁用中止通知 |
| `PI_KNOCK_NOTIFY_INPUT` | 启用 / 禁用“需要处理”通知 |

### Pushover

| 变量 | 用途 |
| --- | --- |
| `PI_KNOCK_PUSHOVER_ENABLED` | 启用 / 禁用 Pushover |
| `PI_KNOCK_PUSHOVER_USER_KEY` | Pushover User Key |
| `PI_KNOCK_PUSHOVER_APP_TOKEN` | Pushover Application API Token |

旧变量 `PI_KNOCK_PUSHOVER_USER` 和 `PI_KNOCK_PUSHOVER_TOKEN` 仍然兼容。

### ntfy

| 变量 | 用途 |
| --- | --- |
| `PI_KNOCK_NTFY_ENABLED` | 启用 / 禁用 ntfy |
| `PI_KNOCK_NTFY_SERVER` | ntfy 服务地址 |
| `PI_KNOCK_NTFY_TOPIC` | ntfy topic |
| `PI_KNOCK_NTFY_ACCESS_TOKEN` | ntfy access token |

旧变量 `PI_KNOCK_NTFY_TOKEN` 仍然兼容。

### Webhook

| 变量 | 用途 |
| --- | --- |
| `PI_KNOCK_WEBHOOK_ENABLED` | 启用 / 禁用 Webhook |
| `PI_KNOCK_WEBHOOK_URL` | 通用 Webhook endpoint |
| `PI_KNOCK_WEBHOOK_BEARER` | 可选 Bearer Token |

## 为什么使用 `agent_settled`？

Pi 在触发 `agent_end` 之后，仍可能因为重试、恢复、上下文压缩或排队任务继续自动运行。

`agent_settled` 才是最终的通知边界：该事件触发后，Pi 不会再自动继续执行。

因此，它更适合作为“现在可以回来看结果了”的通知时机。

## 向后兼容

旧版单文件配置仍然可以读取：

```text
~/.pi/agent/pi-knock.json
```

旧版 Pushover 字段同样继续兼容：

```json
{
  "pushover": {
    "user": "...",
    "token": "..."
  }
}
```

旧的 `minDurationSeconds` / `PI_KNOCK_MIN_DURATION` 设置现在会被忽略。

只要完成通知已启用，每次完成的对话都会发送通知。

新的交互式配置会使用拆分后的 config / credentials 格式。

## 安全

扩展运行在 Pi 进程内部，拥有与你当前用户相同的权限。

- Secret 不保存在 `config.json` 中。
- 在支持的平台上，`credentials.json` 使用仅文件所有者可读写的权限。
- 环境变量可以覆盖磁盘中的凭据。
- `/knock status` 永远不会显示 secret 的实际值。
- 通知发送失败不会中断 Pi agent 的执行。

默认情况下，通知正文会包含当前用户提示词的简短版本。后续计划增加脱敏控制。

## 开发

```bash
npm ci --ignore-scripts
npm run check
pi -ne -e ./src/index.ts
```

测试本地 checkout 时使用 `-ne`，可以避免同时加载另一份已安装的 pi-knock，从而防止重复发送通知。

## Roadmap

- [x] 每次 `agent_settled` 后发送完成通知
- [x] 阻塞式输入 / 确认提醒
- [x] Pushover / Apple Watch
- [x] ntfy
- [x] 通用 Webhook
- [x] `/knock setup`
- [x] `/knock status`
- [x] `/knock test`
- [x] 配置与凭据分离存储
- [ ] 投递重试 / 最近一次投递诊断
- [ ] Secret 遮罩输入
- [ ] 更完整的 Pi-Web session deep link
- [ ] Bark provider
- [ ] Gotify provider
- [ ] 按项目设置通知策略
- [ ] 通知内容脱敏控制
- [ ] 远程回复 / 审批实验

## 发布

版本变化记录在 [CHANGELOG.md](./CHANGELOG.md)。

npm 发布使用 GitHub Actions OIDC + npm Trusted Publishing，因此 release workflow 不需要保存长期有效的 npm token。

安全问题报告说明见 [SECURITY.md](./SECURITY.md)。

## License

MIT
