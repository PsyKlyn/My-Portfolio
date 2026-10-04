(() => {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;

  const tiles = [...grid.querySelectorAll(".project-tile")];
  const filters = [...document.querySelectorAll(".filter")];
  const search = document.getElementById("projectSearch");
  const sort = document.getElementById("projectSort");
  const empty = document.getElementById("projectsEmpty");
  const viewButtons = [...document.querySelectorAll(".view-toggle")];

  let activeFilter = "all";
  let query = "";

  const apply = () => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = tile => {
      const category = tile.dataset.category || "";
      const title = (tile.dataset.title || "").toLowerCase();
      const text = tile.textContent.toLowerCase();
      const filterOK = activeFilter === "all" || category === activeFilter;
      const queryOK = !normalizedQuery || title.includes(normalizedQuery) || text.includes(normalizedQuery);
      return filterOK && queryOK;
    };

    const mode = sort?.value || "latest";
    const compare = (a, b) => {
      if (mode === "az") return (a.dataset.title || "").localeCompare(b.dataset.title || "");
      const da = a.dataset.date || "";
      const db = b.dataset.date || "";
      return mode === "oldest" ? da.localeCompare(db) : db.localeCompare(da);
    };

    // Put matching projects first, then sort within both groups. This prevents
    // filtered projects from appearing lower in the grid.
    const ordered = [...tiles].sort((a, b) => {
      const aMatch = matches(a) ? 0 : 1;
      const bMatch = matches(b) ? 0 : 1;
      if (aMatch !== bMatch) return aMatch - bMatch;
      return compare(a, b);
    });

    ordered.forEach(tile => {
      grid.appendChild(tile);
      tile.hidden = !matches(tile);
    });

    if (empty) empty.hidden = tiles.some(matches);
  };

  filters.forEach(btn => btn.addEventListener("click", () => {
    filters.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter || "all";
    apply();
  }));

  search?.addEventListener("input", e => {
    query = e.target.value.trim().toLowerCase();
    apply();
  });

  sort?.addEventListener("change", apply);

  viewButtons.forEach(btn => btn.addEventListener("click", () => {
    viewButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    grid.classList.toggle("list-view", btn.dataset.view === "list");
  }));

  apply();


  // Custom themed sort dropdown
  const sortShell = document.getElementById("sortDropdown");
  const sortTrigger = sortShell?.querySelector(".sort-dropdown-trigger");
  const sortLabel = document.getElementById("sortDropdownLabel");
  const sortOptions = [...(sortShell?.querySelectorAll(".sort-dropdown-option") || [])];

  const setSort = value => {
    if (!sort) return;
    sort.value = value;
    const option = sortOptions.find(o => o.dataset.sort === value);
    if (option && sortLabel) sortLabel.textContent = option.textContent.trim();
    sortOptions.forEach(o => {
      const active = o.dataset.sort === value;
      o.classList.toggle("active", active);
      o.setAttribute("aria-selected", active ? "true" : "false");
    });
    apply();
  };

  sortTrigger?.addEventListener("click", e => {
    e.stopPropagation();
    const open = sortShell.classList.toggle("open");
    sortTrigger.setAttribute("aria-expanded", open ? "true" : "false");
  });

  sortOptions.forEach(option => option.addEventListener("click", e => {
    e.stopPropagation();
    setSort(option.dataset.sort || "latest");
    sortShell.classList.remove("open");
    sortTrigger?.setAttribute("aria-expanded", "false");
  }));

  document.addEventListener("click", () => {
    sortShell?.classList.remove("open");
    sortTrigger?.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      sortShell?.classList.remove("open");
      sortTrigger?.setAttribute("aria-expanded", "false");
    }
  });

  // Ensure the visual sort state always mirrors the actual sort value.
  if (sort) setSort(sort.value || "latest");

})();
