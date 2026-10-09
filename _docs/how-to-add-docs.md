---
title: 主页使用与维护指南
description: 介绍文档发布、分类管理、项目配置、搜索索引和部署检查方法。
category: site-guide
date: 2026-10-01
updated: 2026-10-09
---

本站使用 Astro 生成静态页面，文档使用 Markdown 编写，分类由统一配置文件管理，精选项目通过 GitHub API 加载。页面支持明暗主题、分类筛选、全文搜索和 RSS。

## 页面结构

- 首页显示站点简介和最近更新的文档。
- 文档页提供分类筛选与标题、摘要搜索。
- 项目页动态读取精选 GitHub 仓库的信息。
- 全站搜索由 Pagefind 在生产构建时生成索引。

## 本地预览

安装 Node.js 22.12 或更高版本，然后在仓库目录执行：

```bash
corepack enable
pnpm install
pnpm dev
```

开发服务器默认位于 `http://localhost:4321`。完整生产构建和预览使用：

```bash
pnpm build
pnpm preview
```

Pagefind 全文搜索只有在执行生产构建后才会生成完整索引。

## 新增文档

在 `_docs` 目录中新建以英文短横线命名的文件，例如：

```text
_docs/dsp-serial-communication.md
```

文件名会成为文档地址的一部分，例如 `/docs/dsp-serial-communication/`。

每篇文档开头需要包含以下 Front Matter：

```yaml
---
title: 文档标题
description: 一句话说明文档内容
category: embedded-dsp
date: 2026-10-09
updated: 2026-10-09
---
```

`date` 是首次发布时间，`updated` 是最近修改时间。更新正文时，应同步修改 `updated`，首页和文档页会按该日期排序。

## 文档分类

分类保存在 `_data/categories.json`。文档中的 `category` 必须填写分类 `slug`，而不是显示名称。

| 分类标识            | 显示名称           |
| ------------------- | ------------------ |
| `power-electronics` | 电力电子           |
| `embedded-dsp`      | 嵌入式与 DSP       |
| `matlab-simulink`   | MATLAB 与 Simulink |
| `personal-thoughts` | 个人思考           |

隐藏的分类管理页面位于 `/admin/categories/`。使用仅授权本仓库 Contents 读写权限的 fine-grained GitHub Token 连接后，可以新增、修改、排序或删除未被文档使用的分类。Token 只保存在当前页面内存中。

分类管理保存后会提交 `_data/categories.json`，并触发 GitHub Actions 重新构建站点。

## 编写正文

Front Matter 之后可以使用标准 Markdown 编写标题、列表、表格、引用和代码块。页面标题已经自动生成，正文应从二级标题开始。

代码块建议注明语言：

````markdown
```c
void example(void)
{
    /* Example code */
}
```
````

## 修改精选项目

精选项目名单位于 `assets/js/site.js` 的 `featuredRepositories` 数组中。数组中的文字必须与 GitHub 仓库名称完全一致。项目页会读取最新的仓库描述、语言和更新时间。

## 发布与更新

提交前建议执行：

```bash
pnpm check
pnpm build
git diff --check
git status
```

推送到 `main` 后，GitHub Actions 会构建并部署 `dist`。仓库的 **Settings → Pages → Build and deployment → Source** 必须选择 **GitHub Actions**。

发布后检查：

- 首页和文档 URL 是否正常。
- 分类筛选、文档搜索和全站搜索是否返回正确结果。
- 明暗主题和手机菜单是否正常。
- 代码块、表格和长标题是否溢出。
- 精选项目是否成功加载。
- `/rss.xml` 是否可以访问。

如果部署失败，请在仓库的 Actions 页面查看构建日志，优先检查 Front Matter、分类 JSON 和 TypeScript 检查结果。
