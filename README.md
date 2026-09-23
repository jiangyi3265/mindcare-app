# MindCare App

面向用户的心理健康服务客户端，提供心理测评、咨询预约、心理课程、公益活动与个人记录等移动端体验。

## 项目简介

`mindcare-app` 是基于 Vue 3 与 uni-app 开发的多端用户应用，包含 14 个用户页面，可构建为 H5 和微信小程序。当前实现覆盖量表浏览与答题、体验计分与报告、咨询预约、课程观看、活动报名和个人记录，并已接入独立的 `mindcare-backend` 与 `mindcare-admin`。

应用启动时会建立匿名安装身份，从后端获取已发布量表、课程和活动，并同步测评、预约、课程进度、活动报名与留言记录。网络不可用时仍可继续使用本地数据，待恢复联网后通过持久化队列补传。匿名身份适合当前公益体验场景；正式跨设备账号应替换为微信登录或平台账号体系。

## 技术栈

- Vue 3.4、JavaScript
- uni-app 3、uni-components
- Vite 5
- H5、微信小程序
- Vue I18n
- qrcode-generator
- Playwright、Node.js Test Runner
- Sharp（图像处理与构建辅助）

## 关联仓库

| 项目 | 说明 | GitHub |
| --- | --- | --- |
| mindcare-backend | 后端服务 | [mindcare-backend](https://github.com/jiangyi3265/mindcare-backend) |
| mindcare-admin | 管理后台 | [mindcare-admin](https://github.com/jiangyi3265/mindcare-admin) |
| mindcare-app | 用户端 | [mindcare-app](https://github.com/jiangyi3265/mindcare-app) |

## 快速启动

准备 Node.js 与 npm，并先启动 `mindcare-backend`。复制环境变量示例后执行：

```bash
npm ci
npm run dev:h5
```

H5 开发地址默认为 `http://127.0.0.1:5173`。`.env.example` 默认通过 `/api` 代理到本机 `8080`；部署 H5 或小程序时，应将 `VITE_API_BASE_URL` 改为后端 HTTPS 地址，并用 `VITE_ADMIN_URL` 配置独立运营后台入口。也可以在 HBuilderX 中打开本目录并运行到浏览器或微信开发者工具。

构建 H5 或微信小程序：

```bash
npm run build:h5
npm run build:mp-weixin
```

微信小程序构建前，需要在 `manifest.json` 的 `mp-weixin.appid` 中填写自己的 AppID。构建产物位于 `dist/`，不会提交到 Git；微信开发者工具应导入 `dist/build/mp-weixin`。

## 主要功能

- 心理测评分类、搜索、量表详情、逐题作答、进度恢复、体验计分与报告摘要
- 心理咨询方式选择、未来日期与时段预约、手机号校验和预约取消
- 心理课程分类、目录切换、本地视频保存与观看进度记录
- 公益活动筛选、详情、报名校验、名额检查与签到二维码
- 测评、预约、课程和活动四类个人记录
- 后端内容拉取、业务记录同步、离线队列与自动补传
- 独立运营后台入口；内容与业务处理统一由 `mindcare-admin` 承担

## 项目结构

```text
components/         页面级组件与通用应用外壳
pages/              14 个 uni-app 路由页面
services/store.js   本机业务状态与离线持久化
services/api.js     用户端 HTTP 接口封装
services/sync.js    匿名身份、内容拉取与记录补传
services/media.js   H5 / 小程序本地媒体保存
data/catalog.js     首次离线启动的兜底内容
styles/theme.css    颜色、字体、圆角和间距规范
static/             应用静态资源
scripts/            uni-app 构建与小程序包体检查脚本
tests/              领域逻辑、UI 与视觉验证脚本
design-reference/   设计参考素材
```

## 测试

```bash
npm test
```

`npm run test:ui` 是会创建、修改、删除测试业务记录的三端浏览器集成测试。请先用**独立测试数据库**启动后端、H5 开发服务（`5173`）和管理后台（`5180`），并设置 `MINDCARE_ISOLATED_TEST_DB=1` 与 `MINDCARE_TEST_ADMIN_PASSWORD` 后运行；不要指向生产数据库。测试输出打印在终端。

## 简历描述示例

参与 MindCare 心理健康用户端开发，基于 Vue 3 与 uni-app 实现心理测评、咨询预约、课程学习、公益活动和个人记录等多端页面，并完成匿名身份、离线队列及与 Spring Boot 后端和 Vue 管理端的数据互通。

## 使用边界

- 当前量表为演示题目与等权体验计分，正式上线前必须由专业人员提供授权题库、计分规则与结果说明。
- 当前无支付功能；用户端使用按安装生成的匿名身份，不等同于实名账号或跨设备登录。
- 示例课程尚未配置视频素材；须由运营后台在课程 JSON 中配置可访问的视频 URL，才能验证实际播放与观看进度。
- 企业微信客服、微信小程序 AppID 与合法域名应由部署方在本地或平台后台配置，不应提交密钥。
