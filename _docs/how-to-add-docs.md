---
title: 如何新增和维护文档
description: 从创建 Markdown 文件到发布更新，介绍本站文档的基本写作流程。
category: site-guide
date: 2026-10-01
updated: 2026-10-01
---

本站的文档保存在仓库的 `_docs` 目录中。每篇文章都是一个 Markdown 文件，提交到 GitHub 后会由 GitHub Pages 自动生成网页。

## 创建文档

在 `_docs` 目录中新建以英文短横线命名的文件，例如：

```text
_docs/dsp-serial-communication.md
```

文件名会成为文档地址的一部分，因此建议使用简短、稳定的英文名称。

## 填写文档信息

每篇文档开头都需要包含以下 Front Matter：

```yaml
---
title: 文档标题
description: 一句话说明文档内容
category: embedded-dsp
date: 2026-10-01
updated: 2026-10-01
---
```

`date` 是首次发布时间，`updated` 是最近修改时间。更新正文时，请同步修改 `updated`，首页和文档中心会按这个日期排序。

## 选择分类

技术文档应使用以下分类之一：

| 分类标识 | 显示名称 |
| --- | --- |
| `power-electronics` | 电力电子 |
| `embedded-dsp` | 嵌入式与 DSP |
| `matlab-tools` | MATLAB 工具 |
| `semiconductor-simulation` | 半导体与器件仿真 |

## 编写正文

Front Matter 之后可以使用标准 Markdown 编写标题、列表、表格、引用和代码块。建议每篇文档只使用一个一级标题；页面标题已经由 `title` 自动生成，正文从二级标题开始。

代码块应注明语言，以便阅读和后续维护。例如：

````markdown
```c
void example(void)
{
    /* Example code */
}
```
````

## 发布与更新

提交 Markdown 文件并推送到主页仓库后，GitHub Pages 会自动构建网站。发布后应检查文档链接、分类、代码块和移动端显示是否正常。
