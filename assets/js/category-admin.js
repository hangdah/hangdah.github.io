(function () {
  "use strict";

  const repositoryOwner = "hangdah";
  const repositoryName = "hangdah.github.io";
  const repositoryBranch = "main";
  const categoriesPath = "_data/categories.json";
  const apiBase = `https://api.github.com/repos/${repositoryOwner}/${repositoryName}`;
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  const authForm = document.querySelector("#github-auth-form");
  const tokenInput = document.querySelector("#github-token");
  const statusBox = document.querySelector("#admin-status");
  const workspace = document.querySelector("#category-workspace");
  const connectionSummary = document.querySelector("#connection-summary");
  const categoryList = document.querySelector("#category-list");
  const addButton = document.querySelector("#add-category");
  const saveButton = document.querySelector("#save-categories");
  const reloadButton = document.querySelector("#reload-categories");
  const disconnectButton = document.querySelector("#disconnect-github");

  if (!authForm || !categoryList) {
    return;
  }

  let githubToken = "";
  let connectedLogin = "";
  let categories = [];
  let originalCategories = "";
  let fileSha = "";
  let isSaving = false;

  const categoryUsage = Array.from(document.querySelectorAll("#category-usage [data-category]"))
    .reduce((usage, item) => {
      const category = item.dataset.category;
      if (!usage.has(category)) {
        usage.set(category, []);
      }
      usage.get(category).push(item.dataset.title);
      return usage;
    }, new Map());

  class GitHubApiError extends Error {
    constructor(status, message) {
      super(message);
      this.name = "GitHubApiError";
      this.status = status;
    }
  }

  function setStatus(message, type = "info", link = null, source = "general") {
    statusBox.hidden = false;
    statusBox.className = `admin-status is-${type}`;
    statusBox.dataset.source = source;
    statusBox.textContent = message;

    if (link) {
      const separator = document.createTextNode(" ");
      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = link.label;
      statusBox.append(separator, anchor);
    }
  }

  function clearStatus() {
    statusBox.hidden = true;
    delete statusBox.dataset.source;
    statusBox.textContent = "";
  }

  function clearCompletedStatus() {
    if (statusBox.classList.contains("is-success")) {
      clearStatus();
    }
  }

  function normalizeCategories(value) {
    return JSON.stringify(value);
  }

  function hasUnsavedChanges() {
    return originalCategories !== "" && normalizeCategories(categories) !== originalCategories;
  }

  function decodeBase64Utf8(encoded) {
    const binary = window.atob(encoded.replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function encodeBase64Utf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    const chunkSize = 0x8000;

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, offset + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return window.btoa(binary);
  }

  async function githubRequest(path, options = {}) {
    const response = await fetch(path.startsWith("https://") ? path : `${apiBase}${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...options.headers
      }
    });

    let body = null;
    try {
      body = await response.json();
    } catch (error) {
      body = null;
    }

    if (!response.ok) {
      throw new GitHubApiError(response.status, body?.message || "GitHub API 请求失败。");
    }

    return body;
  }

  function validateCategories() {
    const itemErrors = categories.map(() => []);
    const globalErrors = [];
    const slugs = new Map();
    const names = new Map();

    if (categories.length === 0) {
      globalErrors.push("至少需要保留一个分类。");
    }

    categories.forEach((category, index) => {
      const slug = category.slug.trim();
      const name = category.name.trim();
      const description = category.description.trim();

      if (!slugPattern.test(slug)) {
        itemErrors[index].push("标识只能包含小写字母、数字和短横线。");
      }
      if (!name) {
        itemErrors[index].push("分类名称不能为空。");
      }
      if (!description) {
        itemErrors[index].push("分类说明不能为空。");
      }

      if (slugs.has(slug)) {
        itemErrors[index].push("分类标识不能重复。");
        itemErrors[slugs.get(slug)].push("分类标识不能重复。");
      } else if (slug) {
        slugs.set(slug, index);
      }

      const normalizedName = name.toLocaleLowerCase("zh-CN");
      if (names.has(normalizedName)) {
        itemErrors[index].push("分类名称不能重复。");
        itemErrors[names.get(normalizedName)].push("分类名称不能重复。");
      } else if (normalizedName) {
        names.set(normalizedName, index);
      }
    });

    if (!categories.some((category) => category.primary)) {
      globalErrors.push("至少需要一个显示在首页的分类。");
    }

    categoryUsage.forEach((documents, slug) => {
      if (documents.length > 0 && !categories.some((category) => category.slug === slug)) {
        globalErrors.push(`分类 ${slug} 仍被文档使用，不能删除。`);
      }
    });

    return {
      itemErrors,
      globalErrors,
      isValid: globalErrors.length === 0 && itemErrors.every((errors) => errors.length === 0)
    };
  }

  function updateEditorValidation() {
    const validation = validateCategories();

    validation.itemErrors.forEach((messages, index) => {
      const card = categoryList.querySelector(`[data-category-index="${index}"]`);
      const errorList = card?.querySelector(".category-validation-errors");
      if (!card || !errorList) {
        return;
      }

      card.classList.toggle("has-errors", messages.length > 0);
      errorList.innerHTML = "";
      messages.forEach((message) => {
        const item = document.createElement("li");
        item.textContent = message;
        errorList.append(item);
      });
      errorList.hidden = messages.length === 0;
    });

    if (validation.globalErrors.length > 0) {
      setStatus(validation.globalErrors.join(" "), "error", null, "validation");
    } else if (statusBox.dataset.source === "validation") {
      clearStatus();
    }

    saveButton.disabled = isSaving || !hasUnsavedChanges() || !validation.isValid;
    return validation;
  }

  function createField(labelText, field, value, index, options = {}) {
    const label = document.createElement("label");
    label.className = options.wide ? "admin-field is-wide" : "admin-field";

    const title = document.createElement("span");
    title.textContent = labelText;

    const input = options.multiline ? document.createElement("textarea") : document.createElement("input");
    input.value = value;
    input.dataset.index = String(index);
    input.dataset.field = field;
    input.disabled = Boolean(options.disabled);

    if (options.multiline) {
      input.rows = 2;
    } else {
      input.type = "text";
    }

    if (options.placeholder) {
      input.placeholder = options.placeholder;
    }

    label.append(title, input);
    return label;
  }

  function createActionButton(label, action, index, disabled = false) {
    const button = document.createElement("button");
    button.className = "icon-button";
    button.type = "button";
    button.dataset.action = action;
    button.dataset.index = String(index);
    button.disabled = disabled;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.textContent = action === "move-up" ? "↑" : action === "move-down" ? "↓" : "删除";
    return button;
  }

  function renderCategories() {
    categoryList.innerHTML = "";

    categories.forEach((category, index) => {
      const usedBy = categoryUsage.get(category.slug) || [];
      const card = document.createElement("article");
      card.className = "admin-category-card";
      card.dataset.categoryIndex = String(index);

      const header = document.createElement("div");
      header.className = "admin-category-header";

      const heading = document.createElement("div");
      const number = document.createElement("span");
      number.className = "admin-category-number";
      number.textContent = String(index + 1).padStart(2, "0");
      const title = document.createElement("h3");
      title.textContent = category.name.trim() || "未命名分类";
      heading.append(number, title);

      const actions = document.createElement("div");
      actions.className = "admin-category-actions";
      actions.append(
        createActionButton("上移分类", "move-up", index, index === 0),
        createActionButton("下移分类", "move-down", index, index === categories.length - 1),
        createActionButton(
          usedBy.length > 0 ? `该分类被 ${usedBy.length} 篇文档使用，不能删除` : "删除分类",
          "delete",
          index,
          usedBy.length > 0
        )
      );
      header.append(heading, actions);

      const fields = document.createElement("div");
      fields.className = "admin-category-fields";
      fields.append(
        createField("显示名称", "name", category.name, index, { placeholder: "例如：控制理论" }),
        createField("分类标识", "slug", category.slug, index, {
          placeholder: "例如：control-theory",
          disabled: usedBy.length > 0
        }),
        createField("分类说明", "description", category.description, index, {
          multiline: true,
          wide: true,
          placeholder: "简要说明该分类包含的内容"
        })
      );

      const footer = document.createElement("div");
      footer.className = "admin-category-footer";

      const primaryLabel = document.createElement("label");
      primaryLabel.className = "toggle-field";
      const primaryInput = document.createElement("input");
      primaryInput.type = "checkbox";
      primaryInput.checked = Boolean(category.primary);
      primaryInput.dataset.index = String(index);
      primaryInput.dataset.field = "primary";
      primaryLabel.append(primaryInput, document.createTextNode("显示在文档筛选栏"));
      footer.append(primaryLabel);

      if (usedBy.length > 0) {
        const usage = document.createElement("p");
        usage.className = "category-usage-note";
        usage.textContent = `已被 ${usedBy.length} 篇文档使用：${usedBy.join("、")}`;
        footer.append(usage);
      }

      const errors = document.createElement("ul");
      errors.className = "category-validation-errors";
      footer.append(errors);

      card.append(header, fields, footer);
      categoryList.append(card);
    });

    updateEditorValidation();
    addButton.disabled = isSaving;
    reloadButton.disabled = isSaving;
    disconnectButton.disabled = isSaving;
  }

  function describeApiError(error) {
    if (!(error instanceof GitHubApiError)) {
      if (error instanceof Error && error.message.startsWith("分类")) {
        return error.message;
      }
      return "无法连接 GitHub，请检查网络后重试。";
    }

    if (error.status === 401) {
      return "Token 无效或已经过期，请重新创建后再试。";
    }
    if (error.status === 403) {
      if (error.message.startsWith("当前 Token")) {
        return error.message;
      }
      return "Token 权限不足，请确认仅为本仓库启用了 Contents 读写权限。";
    }
    if (error.status === 404) {
      return "没有找到分类配置，请确认 Token 可以访问 hangdah.github.io 仓库。";
    }
    if (error.status === 409) {
      return "远端文件已经发生变化。请重新载入后再修改，避免覆盖其他更新。";
    }
    if (error.status === 422) {
      return "GitHub 拒绝了提交，请检查分类数据后重试。";
    }

    return `GitHub API 请求失败：${error.message}`;
  }

  async function loadCategories() {
    setStatus("正在读取最新分类配置…", "info");

    try {
      const file = await githubRequest(`/contents/${categoriesPath}?ref=${repositoryBranch}`);
      const parsed = JSON.parse(decodeBase64Utf8(file.content));

      if (!Array.isArray(parsed)) {
        throw new Error("分类配置不是数组。 ");
      }

      categories = parsed.map((category) => ({
        slug: String(category.slug || ""),
        name: String(category.name || ""),
        description: String(category.description || ""),
        primary: Boolean(category.primary)
      }));
      fileSha = file.sha;
      originalCategories = normalizeCategories(categories);
      connectionSummary.textContent = `已连接为 @${connectedLogin} · ${repositoryOwner}/${repositoryName}`;
      workspace.hidden = false;
      clearStatus();
      renderCategories();
    } catch (error) {
      setStatus(error instanceof SyntaxError ? "分类 JSON 无法解析，请检查仓库文件。" : describeApiError(error), "error");
    }
  }

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const candidateToken = tokenInput.value.trim();

    if (!candidateToken) {
      setStatus("请输入 GitHub Token。", "error");
      return;
    }

    githubToken = candidateToken;
    tokenInput.value = "";
    setStatus("正在验证 GitHub 身份…", "info");

    try {
      const user = await githubRequest("https://api.github.com/user");
      if (user.login.toLocaleLowerCase("en-US") !== repositoryOwner) {
        githubToken = "";
        throw new GitHubApiError(403, `当前 Token 属于 @${user.login}。`);
      }

      connectedLogin = user.login;
      await loadCategories();
    } catch (error) {
      githubToken = "";
      connectedLogin = "";
      setStatus(describeApiError(error), "error");
    }
  });

  categoryList.addEventListener("input", (event) => {
    const input = event.target;
    const index = Number(input.dataset.index);
    const field = input.dataset.field;

    if (!Number.isInteger(index) || !field || !categories[index]) {
      return;
    }

    categories[index][field] = field === "primary" ? input.checked : input.value;
    clearCompletedStatus();

    if (field === "primary") {
      renderCategories();
      return;
    }

    if (field === "name") {
      const heading = input.closest(".admin-category-card")?.querySelector("h3");
      if (heading) {
        heading.textContent = input.value.trim() || "未命名分类";
      }
    }

    updateEditorValidation();
  });

  categoryList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const index = Number(button.dataset.index);
    const action = button.dataset.action;
    clearCompletedStatus();

    if (action === "move-up" && index > 0) {
      [categories[index - 1], categories[index]] = [categories[index], categories[index - 1]];
    } else if (action === "move-down" && index < categories.length - 1) {
      [categories[index + 1], categories[index]] = [categories[index], categories[index + 1]];
    } else if (action === "delete") {
      const category = categories[index];
      if (!window.confirm(`确定删除“${category.name || category.slug || "未命名分类"}”吗？`)) {
        return;
      }
      categories.splice(index, 1);
    }

    renderCategories();
  });

  addButton.addEventListener("click", () => {
    clearCompletedStatus();
    categories.push({ slug: "", name: "", description: "", primary: true });
    renderCategories();
    const newNameInput = categoryList.querySelector(`[data-index="${categories.length - 1}"][data-field="name"]`);
    newNameInput?.focus();
  });

  reloadButton.addEventListener("click", () => {
    if (hasUnsavedChanges() && !window.confirm("重新载入会丢失尚未保存的修改，确定继续吗？")) {
      return;
    }
    loadCategories();
  });

  disconnectButton.addEventListener("click", () => {
    if (hasUnsavedChanges() && !window.confirm("断开连接会丢失尚未保存的修改，确定继续吗？")) {
      return;
    }

    githubToken = "";
    connectedLogin = "";
    categories = [];
    originalCategories = "";
    fileSha = "";
    workspace.hidden = true;
    categoryList.innerHTML = "";
    clearStatus();
    tokenInput.focus();
  });

  saveButton.addEventListener("click", async () => {
    const validation = validateCategories();
    if (!validation.isValid || !hasUnsavedChanges() || isSaving) {
      renderCategories();
      return;
    }

    isSaving = true;
    renderCategories();
    setStatus("正在提交分类配置…", "info");

    const cleanCategories = categories.map((category) => ({
      slug: category.slug.trim(),
      name: category.name.trim(),
      description: category.description.trim(),
      primary: Boolean(category.primary)
    }));
    const content = `${JSON.stringify(cleanCategories, null, 2)}\n`;

    try {
      const result = await githubRequest(`/contents/${categoriesPath}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "更新文档分类",
          content: encodeBase64Utf8(content),
          sha: fileSha,
          branch: repositoryBranch
        })
      });

      categories = cleanCategories;
      fileSha = result.content.sha;
      originalCategories = normalizeCategories(categories);
      setStatus(
        "分类已经提交。GitHub Pages 完成部署后，主页会自动更新。",
        "success",
        { url: result.commit.html_url, label: "查看提交 ↗" }
      );
    } catch (error) {
      setStatus(describeApiError(error), "error");
    } finally {
      isSaving = false;
      renderCategories();
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
})();
