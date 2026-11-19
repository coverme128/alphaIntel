# 开源发布前核对记录

核对日期：2026-11-19（Asia/Shanghai）。基线提交：`ef00fca`。本记录描述本次本地检查，不是持续安全认证。

## GitHub 与介绍

通过 GitHub 仓库 API 核对 `coverme128/alphaIntel`：仓库已公开，默认分支为 `main`，About 描述、Topics 和许可证识别字段为空。执行 `git fetch origin` 后，本地 HEAD 与 `origin/main` 一致。

本次已准备面向新用户的 README、3 张真实页面截图、MIT 许可证、配置示例、贡献说明和安全说明，并在 npm 元数据中补充描述、仓库地址和许可证。`package.json` 保持 `private: true`，仅防止误发布 npm 包，不影响 Git 仓库开源。

GitHub About 是独立设置，不会随 README 自动更新。可使用以下简介与主题：

> Local-first crypto opportunity research dashboard with public exchange data, auditable calculations, paper trading and a personal ledger. No exchange API keys required.

建议 Topics：`crypto`、`market-data`、`funding-rate`、`paper-trading`、`portfolio-tracker`、`typescript`、`react`、`local-first`。

## 敏感信息检查

- 基线有 223 个受跟踪文件，4 个提交，238 个可达历史 blob；对当前文件、暂存内容及本地全部 refs / reflog 可达历史执行启发式扫描。
- 基线未跟踪实际 `.env`、`.data/`、云凭据或私钥路径；历史文件名检查也没有发现此类路径。
- 项目目录检查只发现新的 `.env.example` 和原始规格中的 `production.env.example` 两个环境模板；排除了依赖、构建、`.git` 和运行数据目录。两份模板均为非敏感参数或占位符，原始生产模板不是当前运行配置。
- 配置的规则未命中常见令牌、私钥、凭据 URL 或疑似秘密赋值；同时检查了受跟踪文本中的个人主目录路径和邮箱，基线未发现匹配。
- 已扩充 `.gitignore`，覆盖 `.env.local`、`.env.production.local`、嵌套 `*.env` 等变体及常见凭据、备份、导出目录；保留明确的示例模板。
- 截图采用隔离临时目录和零模拟资金，没有加载个人账本；已人工查看三张图片。

新增 `npm run security:check` 与 `npm run security:history`，输出定位信息而不输出秘密原值。使用合成令牌测试了环境文件、暂存残留和已删除历史内容三种情况。完整测试共 133 项通过，TypeScript 与前端构建通过。

**结论**：本次覆盖范围内未发现 `.env` 信息或已配置规则能识别的凭据泄漏。不能据此保证完全没有秘密，也未审计 GitHub Issues、Actions 日志、附件、发布包、外部副本和不可达对象；图片与压缩包不由文本规则解析。详见 [安全说明](../SECURITY.md)。

## 发布注意

推送前重新运行 `npm run security:history` 并检查实际暂存差异；不要包含 `.data/`。维护者应确认 `specs/` 等随仓库发布内容的授权来源，第三方依赖保持各自许可证。GitHub About 文案需单独设置；许可证识别需仓库中存在已推送的 `LICENSE`。
