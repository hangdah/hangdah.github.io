(function () {
  "use strict";

  const docsList = document.querySelector("#docs-list");

  if (docsList) {
    const searchInput = document.querySelector("#doc-search");
    const filterButtons = Array.from(document.querySelectorAll(".filter-button"));
    const documents = Array.from(docsList.querySelectorAll(".searchable-document"));
    const emptyState = document.querySelector("#docs-empty");
    const validCategories = filterButtons.map((button) => button.dataset.category);
    const requestedCategory = new URLSearchParams(window.location.search).get("category");
    let activeCategory = validCategories.includes(requestedCategory) ? requestedCategory : "all";

    function updateFilterButtons() {
      filterButtons.forEach((button) => {
        const isActive = button.dataset.category === activeCategory;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    }

    function filterDocuments() {
      const query = searchInput.value.trim().toLocaleLowerCase("zh-CN");
      let visibleCount = 0;

      documents.forEach((documentCard) => {
        const matchesCategory = activeCategory === "all" || documentCard.dataset.category === activeCategory;
        const matchesSearch = !query || documentCard.dataset.search.toLocaleLowerCase("zh-CN").includes(query);
        const isVisible = matchesCategory && matchesSearch;

        documentCard.hidden = !isVisible;
        if (isVisible) {
          visibleCount += 1;
        }
      });

      emptyState.hidden = visibleCount !== 0;
    }

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.category;
        updateFilterButtons();
        filterDocuments();

        const url = new URL(window.location.href);
        if (activeCategory === "all") {
          url.searchParams.delete("category");
        } else {
          url.searchParams.set("category", activeCategory);
        }
        window.history.replaceState({}, "", url);
      });
    });

    searchInput.addEventListener("input", filterDocuments);
    updateFilterButtons();
    filterDocuments();
  }

  const projectList = document.querySelector("#project-list");

  if (projectList) {
    const featuredRepositories = [
      "DSPSerialMonitor",
      "dah_boost_600w",
      "Boost_Controller_Template"
    ];

    function renderProjectError() {
      projectList.removeAttribute("aria-busy");
      projectList.innerHTML = "";

      const error = document.createElement("div");
      error.className = "project-error";

      const message = document.createElement("p");
      message.textContent = "项目暂时加载失败，请稍后重试。";

      const retryButton = document.createElement("button");
      retryButton.className = "retry-button";
      retryButton.type = "button";
      retryButton.textContent = "重新加载";
      retryButton.addEventListener("click", loadProjects);

      error.append(message, retryButton);
      projectList.append(error);
    }

    function renderProjects(repositories) {
      projectList.removeAttribute("aria-busy");
      projectList.innerHTML = "";

      repositories.forEach((repository) => {
        const card = document.createElement("a");
        card.className = "project-card";
        card.href = repository.html_url;
        card.target = "_blank";
        card.rel = "noopener noreferrer";

        const heading = document.createElement("div");
        heading.className = "project-card-header";

        const title = document.createElement("h3");
        title.textContent = repository.name;

        const arrow = document.createElement("span");
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "↗";

        const description = document.createElement("p");
        description.textContent = repository.description || "项目说明正在整理中。";

        heading.append(title, arrow);
        card.append(heading, description);

        if (repository.language) {
          const language = document.createElement("span");
          language.className = "project-language";
          language.textContent = repository.language;
          card.append(language);
        }

        projectList.append(card);
      });
    }

    async function loadProjects() {
      projectList.setAttribute("aria-busy", "true");
      projectList.innerHTML = '<p class="loading-state">正在加载项目…</p>';

      try {
        const response = await fetch("https://api.github.com/users/hangdah/repos?per_page=100&sort=updated", {
          headers: { Accept: "application/vnd.github+json" }
        });

        if (!response.ok) {
          throw new Error(`GitHub API returned ${response.status}`);
        }

        const repositories = await response.json();
        const featured = repositories
          .filter((repository) => featuredRepositories.includes(repository.name) && !repository.archived)
          .sort((first, second) => new Date(second.updated_at) - new Date(first.updated_at));

        if (featured.length === 0) {
          throw new Error("No featured repositories were returned");
        }

        renderProjects(featured);
      } catch (error) {
        renderProjectError();
      }
    }

    loadProjects();
  }
})();
