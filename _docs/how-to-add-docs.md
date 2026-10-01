---
title: 主页使用与维护指南
description: 介绍主页浏览、文档发布、分类管理、项目配置和部署检查方法。
category: site-guide
date: 2026-10-01
updated: 2026-10-01
---

这是一份面向站点维护者的使用说明。主页通过 GitHub Pages 和 Jekyll 生成，文档使用 Markdown 编写，分类由统一配置文件管理，精选项目通过 GitHub API 加载。

## 浏览主页

主页由三个主要区域组成：

1. **文档分类**：进入电力电子、嵌入式与 DSP、MATLAB 与 Simulink、个人思考等主题。
2. **最近更新**：根据文档的 `updated` 日期展示最近修改的内容。
3. **精选项目**：动态读取指定 GitHub 仓库的名称、描述和主要语言。

文档中心提供分类筛选和关键词搜索。搜索范围包括文档标题与摘要，筛选条件会保留在页面地址的 `category` 参数中。

## 正确预览网站

不要直接双击仓库中的 `index.html`。该文件包含 Jekyll Front Matter 和 Liquid 模板，直接打开时会看到 `{% ... %}` 等未处理的源码。

- 线上页面：<https://hangdah.github.io/>
- 已安装 Jekyll 时，在仓库目录运行 `jekyll serve`，再访问终端显示的本地地址。

推送修改后，GitHub Pages 通常需要短暂时间完成构建。如果线上内容没有立即更新，可以稍后刷新并检查仓库的 Pages 构建状态。

## 新增文档

在 `_docs` 目录中新建以英文短横线命名的文件，例如：

```text
_docs/dsp-serial-communication.md
```

文件名会成为文档地址的一部分，例如上面的文件会生成 `/docs/dsp-serial-communication/`。建议使用简短、稳定的小写英文名称，单词之间用短横线连接。

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

## 选择文档分类

技术文档应使用以下分类之一：

| 分类标识 | 显示名称 |
| --- | --- |
| `power-electronics` | 电力电子 |
| `embedded-dsp` | 嵌入式与 DSP |
| `matlab-simulink` | MATLAB 与 Simulink |
| `personal-thoughts` | 个人思考 |

文档中的 `category` 必须填写分类标识，而不是显示名称。例如应填写 `matlab-simulink`，不能填写 `MATLAB 与 Simulink`。

## 新增、修改或删除分类

所有分类都集中定义在 `_data/categories.yml`。首页分类卡片和文档中心筛选按钮会自动读取该文件，不需要分别修改页面代码。

新增分类时，在文件中加入一段配置：

```yaml
- slug: control-theory
  name: 控制理论
  description: 控制系统分析、设计与学习记录。
  primary: true
```

字段含义如下：

| 字段 | 用途 |
| --- | --- |
| `slug` | 分类的唯一标识，只使用小写英文字母、数字和短横线，发布后尽量不要修改。 |
| `name` | 页面上显示的分类名称。 |
| `description` | 首页分类卡片中的简短说明。 |
| `primary` | `true` 时显示在首页和筛选栏；`false` 时仅作为内部分类使用。 |

配置在文件中的排列顺序就是分类卡片和筛选按钮的显示顺序。

删除分类前，先搜索 `_docs` 目录中使用该 `slug` 的文章，将这些文章迁移到其他分类，然后再删除对应配置。否则文章仍能生成，但分类名称会退化为原始 `slug`，也不会出现在筛选按钮中。

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

## 修改精选项目

精选项目名单位于 `assets/js/site.js` 的 `featuredRepositories` 数组中：

```javascript
const featuredRepositories = [
  "DSPSerialMonitor",
  "dah_boost_600w",
  "Boost_Controller_Template"
];
```

数组中的文字必须与 GitHub 仓库名称完全一致。增加或删除名称后，主页会通过 GitHub 公共 API 获取最新的仓库描述、语言和更新时间，并按最近更新时间排序。

## 发布与更新

修改完成后，先使用以下命令检查变更范围：

```bash
git status
git diff --check
git diff
```

确认没有意外修改后，再提交并推送到 `main` 分支。GitHub Pages 会自动构建网站。发布后建议检查：

- 首页分类名称、顺序和文档数量是否正确。
- 新文档能否从首页和文档中心打开。
- 分类筛选与中文关键词搜索是否正常。
- 代码块、表格和长标题在手机上是否溢出。
- 精选项目是否成功加载并跳转到正确仓库。

## 常见问题

### 页面显示 `---` 或 `{% ... %}`

这是直接打开了 Jekyll 源文件。请访问线上页面，或通过 `jekyll serve` 启动本地预览。

### 文档显示了英文分类标识

检查文档的 `category` 是否能在 `_data/categories.yml` 中找到完全一致的 `slug`。

### 精选项目加载失败

GitHub 公共 API 可能因网络问题或匿名访问频率限制暂时不可用。页面会显示重新加载按钮，GitHub Profile 链接仍然可以使用。

### 推送后网站构建失败

优先检查 YAML 缩进、文档开头和结尾的 `---`，以及 Front Matter 中是否存在未闭合的引号。也可以在仓库的 Pages 或 Actions 页面查看具体构建错误。
