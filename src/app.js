import { calculateItem, differenceBetween } from "./calculators.js";

const isReturns = document.body.dataset.game === "returns";
const catalogFile = isReturns ? "returns-items.json" : "items.json";
const tierOrder = isReturns
  ? ["All", "Common", "Uncommon", "Legendary", "Boss", "Equipment", "Special"]
  : ["All", "Common", "Uncommon", "Legendary", "Boss", "Lunar", "Void", "Meal", "Equipment", "Other"];
const tierColors = {
  All: "#e9e2d4",
  Common: "#e9e2d4",
  Uncommon: "#85c94b",
  Legendary: "#e64b4b",
  Boss: "#e9bb38",
  Lunar: "#6b9fd4",
  Void: "#a760c7",
  Meal: "#f08b3f",
  Equipment: "#d87932",
  Other: "#82909a",
  Special: "#b892dc"
};

const state = {
  items: [],
  visibleItems: [],
  selected: null,
  filter: "All",
  query: "",
  pinned: false,
  sheetOpen: false,
  stackCounts: new Map()
};

const elements = {
  filters: document.querySelector("#tier-filters"),
  grid: document.querySelector("#item-grid"),
  resultCount: document.querySelector("#result-count"),
  resultsTitle: document.querySelector("#results-title"),
  detail: document.querySelector("#detail-panel"),
  search: document.querySelector("#search"),
  empty: document.querySelector("#empty-state"),
  clear: document.querySelector("#clear-search"),
  backdrop: document.querySelector("#sheet-backdrop"),
  footerCount: document.querySelector("#footer-count"),
  footerVerified: document.querySelector("#footer-verified")
};

const mobileQuery = window.matchMedia("(max-width: 900px)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

function searchableText(item) {
  const recipeText = item.chef?.recipes.flatMap((recipe) => ["wandering chef recipe", recipe.category, ...recipe.ingredients.flat()]) || [];
  return [item.name, ...item.aliases, item.summary, item.exactEffect, ...item.tags, item.dlc, item.tier, item.subTier, item.unlock, ...recipeText]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function countForTier(tier) {
  return tier === "All" ? state.items.length : state.items.filter((item) => item.tier === tier).length;
}

function renderFilters() {
  elements.filters.replaceChildren();
  for (const tier of tierOrder) {
    const count = countForTier(tier);
    if (!count && tier !== "All") continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tier-filter";
    button.dataset.tier = tier;
    button.style.setProperty("--tier-color", tierColors[tier]);
    button.setAttribute("aria-pressed", String(state.filter === tier));
    button.innerHTML = `<span class="tier-dot" aria-hidden="true"></span><span>${tier}</span><span class="filter-count">${count}</span>`;
    button.addEventListener("click", () => {
      state.filter = tier;
      state.pinned = false;
      applyFilters();
      renderFilters();
    });
    elements.filters.append(button);
  }
}

function applyFilters() {
  const terms = state.query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  state.visibleItems = state.items.filter((item) => {
    const tierMatch = state.filter === "All" || item.tier === state.filter;
    const haystack = item.searchText;
    return tierMatch && terms.every((term) => haystack.includes(term));
  });

  if (!state.visibleItems.some((item) => item.id === state.selected?.id)) {
    state.selected = state.visibleItems[0] || null;
    state.pinned = false;
  }
  renderGrid();
  renderDetail();
}

function selectItem(item, { pin = false, openSheet = false } = {}) {
  state.selected = item;
  if (pin) state.pinned = true;
  if (openSheet) state.sheetOpen = true;
  renderDetail();
  updateSelectedCards();
}

function updateSelectedCards() {
  for (const card of elements.grid.querySelectorAll(".item-card")) {
    const selected = card.dataset.id === state.selected?.id;
    card.classList.toggle("is-selected", selected);
    card.setAttribute("aria-pressed", String(selected && state.pinned));
  }
}

function makeItemCard(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "item-card";
  button.dataset.id = item.id;
  button.dataset.tier = item.tier;
  button.style.setProperty("--tier-color", tierColors[item.tier]);
  button.setAttribute("role", "listitem");
  button.setAttribute("aria-controls", "detail-panel");
  button.setAttribute("aria-pressed", String(state.pinned && state.selected?.id === item.id));
  button.setAttribute("aria-label", `${item.name}. ${item.tier}. ${item.summary}`);
  button.innerHTML = `
    <span class="item-art">
      <img src="${item.icon}" alt="${item.name} item icon" loading="lazy" decoding="async" />
      <span class="item-fallback" aria-hidden="true">${item.name.slice(0, 2).toUpperCase()}</span>
    </span>
    <span class="item-name">${item.name}</span>
  `;
  button.querySelector("img").addEventListener("error", (event) => event.currentTarget.classList.add("is-missing"));
  button.addEventListener("mouseenter", () => {
    if (finePointer.matches && !state.pinned) selectItem(item);
  });
  button.addEventListener("focus", () => {
    if (!state.pinned) selectItem(item);
  });
  button.addEventListener("click", () => selectItem(item, { pin: true, openSheet: mobileQuery.matches }));
  return button;
}

function renderGrid() {
  const fragment = document.createDocumentFragment();
  for (const item of state.visibleItems) fragment.append(makeItemCard(item));
  elements.grid.replaceChildren(fragment);
  elements.empty.hidden = state.visibleItems.length > 0;
  elements.grid.hidden = state.visibleItems.length === 0;
  const resultWord = state.visibleItems.length === 1 ? "pickup" : "pickups";
  elements.resultCount.textContent = `${state.visibleItems.length} ${resultWord}`;
  elements.resultsTitle.textContent = state.filter === "All" ? "All pickups" : state.filter;
  updateSelectedCards();
}

function statLine(result) {
  return `<span>${result.stat}</span><strong>${result.display}</strong>`;
}

function renderStackTable(item) {
  const primary = item.stacking.stats.find((stat) => stat.stacking !== "ProcCoeff");
  if (!primary || !calculateItem(item, 1)[0]?.supported) return "";
  const values = [1, 2, 5, 10].map((count) => calculateItem(item, count)[0]);
  return `
    <div class="stack-table" aria-label="Example stack values">
      <div class="stack-table-row stack-table-head"><span>Stacks</span>${[1, 2, 5, 10].map((count) => `<span>${count}</span>`).join("")}</div>
      <div class="stack-table-row"><span>${primary.stat}</span>${values.map((value) => `<strong>${value?.display || "—"}</strong>`).join("")}</div>
    </div>
  `;
}

function renderIngredientGroup(group, label) {
  return `
    <div class="ingredient-group">
      <span class="ingredient-label">${label}</span>
      <div class="ingredient-options">
        ${group.map((name, index) => `${index ? '<span class="ingredient-or">or</span>' : ""}<span class="ingredient-chip">${name}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderChefRecipes(item) {
  if (!item.chef?.recipes?.length) return "";
  const recipeWord = item.chef.recipes.length === 1 ? "recipe" : "recipes";
  return `
    <section class="chef-recipes" aria-labelledby="chef-title">
      <div class="chef-title-row">
        <div>
          <p class="section-label">Wandering CHEF</p>
          <h3 id="chef-title">How to create</h3>
        </div>
        <a href="${item.chef.source}" target="_blank" rel="noreferrer">${recipeWord} ↗</a>
      </div>
      <p class="chef-intro">Combine one pickup from each side. Both ingredients are consumed.</p>
      <div class="chef-recipe-list">
        ${item.chef.recipes.map((recipe) => `
          <article class="chef-recipe">
            <div class="chef-recipe-meta">
              <span>${recipe.category}</span>
              <strong>Yields ${recipe.yield}</strong>
            </div>
            <div class="chef-ingredients">
              ${renderIngredientGroup(recipe.ingredients[0], "Ingredient 1")}
              <span class="chef-plus" aria-hidden="true">+</span>
              ${renderIngredientGroup(recipe.ingredients[1], "Ingredient 2")}
            </div>
            ${recipe.note ? `<p class="chef-note">${recipe.note}</p>` : ""}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderDetail() {
  const item = state.selected;
  elements.detail.classList.toggle("is-open", Boolean(item && state.sheetOpen));
  document.body.classList.toggle("detail-open", Boolean(item && state.sheetOpen));
  if (!item) {
    elements.detail.innerHTML = `<div class="detail-placeholder"><p class="section-label">Item detail</p><h2>No item selected</h2><p>Search or choose a pickup to inspect its stacking behavior.</p></div>`;
    return;
  }

  const stacks = state.stackCounts.get(item.id) || 1;
  const current = calculateItem(item, stacks);
  const next = calculateItem(item, stacks + 1);
  const primary = current[0] || null;
  const primaryNext = next[0] || null;
  const marginal = primary && primaryNext ? differenceBetween(primary, primaryNext) : null;
  const behavior = item.stacking.type === "None" ? "No meaningful stacking" : `${item.stacking.type} stacking`;
  const detailColor = tierColors[item.tier];
  const currentValue = primary?.display || (item.equipment?.cooldown != null ? `${item.equipment.cooldown}s cooldown` : "Fixed effect");
  const nextValue = primaryNext?.display || currentValue;
  const currentLabel = primary?.stat || "Effect";

  elements.detail.style.setProperty("--tier-color", detailColor);
  elements.detail.innerHTML = `
    <div class="sheet-handle" aria-hidden="true"></div>
    <button class="detail-close" type="button" aria-label="Close item details">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" /></svg>
    </button>
    <div class="detail-heading">
      <div class="detail-icon"><img src="${item.icon}" alt="${item.name} item icon" /></div>
      <div>
        <p class="tier-line"><span class="tier-dot"></span>${item.tier}${item.subTier ? ` / ${item.subTier.replace(" Equipment", "")}` : ""}</p>
        <h2>${item.name}</h2>
        <p class="detail-dlc">${item.dlc}</p>
      </div>
    </div>

    <div class="detail-copy">
      <p class="summary">${item.summary}</p>
      ${item.exactEffect !== item.summary ? `<p class="exact-effect">${item.exactEffect}</p>` : ""}
    </div>

    ${item.notes?.length ? `<div class="mechanics-notes">${item.notes.map((note) => `<p>${note}</p>`).join("")}</div>` : ""}

    ${renderChefRecipes(item)}

    ${isReturns && item.equipment ? `
    <section class="calculator" aria-labelledby="calculator-title">
      <div class="calculator-title-row">
        <div><p class="section-label">Equipment</p><h3 id="calculator-title">Activation cooldown</h3></div>
      </div>
      <div class="calculation-result"><div class="current-result"><span>Base cooldown</span><strong>${item.equipment.cooldown}s</strong></div></div>
      <p class="equipment-note">Equipment occupies one slot. Additional copies do not stack; cooldown-reducing items apply separately.</p>
    </section>
    ` : `
    <section class="calculator" aria-labelledby="calculator-title">
      <div class="calculator-title-row">
        <div>
          <p class="section-label">Stack calculator</p>
          <h3 id="calculator-title">Compare next stack</h3>
        </div>
        <span class="behavior-badge">${behavior}</span>
      </div>

      <div class="stack-control" aria-label="Stack count">
        <button class="stack-button" data-action="decrement" type="button" aria-label="Remove one stack" ${stacks <= 1 ? "disabled" : ""}>−</button>
        <label><span>Current stacks</span><input class="stack-input" type="number" min="1" max="999" value="${stacks}" inputmode="numeric" aria-label="Current stack count" /></label>
        <button class="stack-button" data-action="increment" type="button" aria-label="Add one stack">+</button>
      </div>

      <div class="calculation-result">
        <div class="current-result">
          <span>Current <small>${stacks} ${stacks === 1 ? "stack" : "stacks"}</small></span>
          <strong>${currentValue}</strong>
          <small>${currentLabel}</small>
        </div>
        <div class="next-result">
          <span>Taking another</span>
          <strong>${stacks + 1} stacks <i>→</i> ${nextValue}</strong>
          <small>${marginal ? `Marginal change ${marginal}` : "Effect is unchanged or uses a custom rule"}</small>
        </div>
      </div>

      ${current.length > 1 ? `<div class="secondary-stats"><p class="section-label">Other calculated effects</p>${current.slice(1).map(statLine).join("")}</div>` : ""}
    </section>

    <section class="stacking-notes">
      <div class="formula-row"><span>Formula</span><strong>${item.stacking.formula}</strong></div>
      ${renderStackTable(item)}
    </section>
    `}

    <div class="detail-source">
      <div><span>Source</span><a href="${item.source}" target="_blank" rel="noreferrer">Trace mechanics ↗</a></div>
      <div><span>Verified</span><strong>${new Date(`${item.lastVerified}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</strong></div>
    </div>
  `;

  elements.detail.querySelector(".detail-close").addEventListener("click", closeSheet);
  elements.detail.querySelector('[data-action="decrement"]')?.addEventListener("click", () => setStacks(stacks - 1));
  elements.detail.querySelector('[data-action="increment"]')?.addEventListener("click", () => setStacks(stacks + 1));
  elements.detail.querySelector(".stack-input")?.addEventListener("change", (event) => setStacks(event.currentTarget.value));
}

function setStacks(value) {
  if (!state.selected) return;
  const count = Math.min(999, Math.max(1, Math.floor(Number(value) || 1)));
  state.stackCounts.set(state.selected.id, count);
  renderDetail();
}

function closeSheet() {
  state.sheetOpen = false;
  state.pinned = false;
  renderDetail();
  elements.grid.querySelector(`[data-id="${state.selected?.id}"]`)?.focus({ preventScroll: true });
}

function clearAll() {
  state.query = "";
  state.filter = "All";
  state.pinned = false;
  elements.search.value = "";
  renderFilters();
  applyFilters();
  elements.search.focus();
}

function gridColumnCount() {
  const columns = getComputedStyle(elements.grid).gridTemplateColumns.split(" ").filter(Boolean);
  return Math.max(1, columns.length);
}

function moveGridFocus(direction) {
  const cards = [...elements.grid.querySelectorAll(".item-card")];
  if (!cards.length) return;
  const current = document.activeElement.closest?.(".item-card");
  const index = Math.max(0, cards.indexOf(current));
  const columns = gridColumnCount();
  const movement = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[direction];
  cards[Math.min(cards.length - 1, Math.max(0, index + movement))].focus();
}

elements.search.addEventListener("input", (event) => {
  state.query = event.currentTarget.value;
  state.pinned = false;
  applyFilters();
});
elements.clear.addEventListener("click", clearAll);
elements.backdrop.addEventListener("click", closeSheet);
mobileQuery.addEventListener("change", () => {
  if (!mobileQuery.matches) state.sheetOpen = false;
  renderDetail();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== elements.search) {
    event.preventDefault();
    elements.search.focus();
    elements.search.select();
    return;
  }
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) && document.activeElement.closest?.(".item-card")) {
    event.preventDefault();
    moveGridFocus(event.key);
  }
  if (event.key === "Escape") {
    if (state.sheetOpen) closeSheet();
    else if (state.query || state.filter !== "All") clearAll();
    else {
      state.pinned = false;
      updateSelectedCards();
    }
  }
});

async function init() {
  try {
    const response = await fetch(new URL(`../data/${catalogFile}`, import.meta.url));
    if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
    const dataset = await response.json();
    state.items = dataset.items.map((item) => ({ ...item, searchText: searchableText(item) }));
    state.selected = state.items.find((item) => item.name === "Soldier's Syringe") || state.items[0];
    elements.footerCount.textContent = dataset.meta.total;
    const verified = dataset.meta.lastVerified || state.items[0]?.lastVerified;
    if (elements.footerVerified && verified) {
      elements.footerVerified.textContent = `Verified ${new Date(`${verified}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
    }
    renderFilters();
    applyFilters();
  } catch (error) {
    console.error(error);
    elements.grid.innerHTML = `<div class="load-error"><p class="empty-code">DATA OFFLINE</p><h2>The item catalog could not be loaded.</h2><p>Start the local server and refresh this page.</p></div>`;
    elements.resultCount.textContent = "Catalog unavailable";
  }
}

init();
