# Pushover 配置指南

本文介绍如何为 **pi-knock** 准备 Pushover，包括注册账号、安装 App、获取 User Key、创建 Application API Token，以及在 Pi 中完成配置。

完成后，你需要拿到两个值：

- **User Key**：你的 Pushover 账号标识
- **Application API Token**：你创建的 Pushover Application 的 API Token

> 不要把登录密码填到 pi-knock 中。pi-knock 只需要 User Key 和 Application API Token。

## 1. 注册 Pushover 账号

你可以通过以下任一方式注册：

- 网页注册：<https://pushover.net/signup>
- 在 Pushover iOS / Android App 内直接注册

使用自己的邮箱和密码创建账号，然后登录 Pushover。

## 2. 下载 Pushover App

官方客户端：

- iPhone / iPad / Apple Watch：<https://pushover.net/clients/ios>
- Android：<https://pushover.net/clients/android>
- Desktop：<https://pushover.net/clients/desktop>

Pushover 提供 30 天试用。当前个人版在试用结束后按平台一次性购买，具体价格以官方页面为准：

<https://pushover.net/pricing>

如果你主要是为了让 pi-knock 给 iPhone 或 Apple Watch 发通知，只需要先安装 iOS 版即可。

## 3. 登录 App 并注册设备

在手机上打开 Pushover，使用刚才创建的账号登录。

首次登录后，按照 App 提示完成设备注册，并允许系统通知权限。

建议先确认 Pushover 自身能够正常收到通知，再继续配置 pi-knock。

### Apple Watch

Pushover 的 iOS 客户端支持 Apple Watch。

如果通知没有出现在手表上，请检查：

1. iPhone 已正常收到 Pushover 通知。
2. Apple Watch 已与该 iPhone 正常配对。
3. Watch App 中允许 Pushover 通知。
4. iPhone / Apple Watch 的专注模式或通知设置没有拦截 Pushover。

## 4. 获取 User Key

登录 Pushover 网站：

<https://pushover.net/>

在账号首页可以看到你的 **User Key**。

它通常是一串类似下面的字符串：

```text
uXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

复制并保存这个值，稍后执行 `/knock setup` 时会用到。

> User Key 不是邮箱地址，也不是登录密码。

## 5. 创建 Application API Token

pi-knock 还需要一个 Application API Token。

登录 Pushover 后，打开：

<https://pushover.net/apps/build>

创建一个新的 Application/API Token。

推荐填写：

```text
Name: pi-knock
Type: Application
Description: Notifications from pi-knock
```

创建完成后，Pushover 会生成一个 **API Token/Key**。

复制这个 Token。

最终你应该有：

```text
User Key
Application API Token
```

Pushover 官方也建议：对于安装在不同用户机器上的开源项目，由每个用户创建自己的 Application Token，而不是项目作者在代码中内置一个公共 Token。

## 6. 在 pi-knock 中配置

安装 pi-knock 后执行：

```text
/knock setup
```

选择：

```text
Pushover (iPhone / Apple Watch)
```

然后依次输入：

```text
User Key
Application API Token
```

保存后，pi-knock 会立即发送一条测试通知。

如果手机收到测试消息，配置已经完成。

你也可以随时执行：

```text
/knock test
```

再次测试。

查看当前配置：

```text
/knock status
```

## 7. 常见问题

### 没收到测试通知

优先检查：

- Pushover App 是否已经登录并注册设备
- 系统是否允许 Pushover 发送通知
- User Key 是否复制完整
- Application API Token 是否复制完整
- User Key 和 API Token 是否填反
- 当前网络是否能够访问 Pushover

### Apple Watch 没通知，但 iPhone 有

这通常说明 pi-knock → Pushover 已经正常工作，问题在 iPhone / Apple Watch 的通知同步设置。

先检查 Watch App 中的通知设置，以及专注模式、静音和通知镜像配置。

### User Key 和 API Token 有什么区别？

| 值 | 含义 |
| --- | --- |
| **User Key** | 消息要发送给哪个 Pushover 用户 |
| **Application API Token** | 哪个应用正在发送消息 |

pi-knock 需要同时提供这两个值。

### 凭据保存在哪里？

pi-knock 默认将凭据保存在：

```text
~/.pi/agent/pi-knock/credentials.json
```

配置和凭据是分开保存的。

> Pi 当前的标准输入框不会隐藏输入内容，因此请只在私有终端或私有会话中执行 `/knock setup`。

## 官方链接

- Pushover 首页：<https://pushover.net/>
- 注册账号：<https://pushover.net/signup>
- 客户端下载：<https://pushover.net/clients>
- 创建 Application/API Token：<https://pushover.net/apps/build>
- API 文档：<https://pushover.net/api>
- 价格说明：<https://pushover.net/pricing>
