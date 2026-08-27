(() => {
  "use strict";

  // SPDX-License-Identifier: GPL-3.0-only

  if (globalThis.__pureViewContentLoaded) return;
  globalThis.__pureViewContentLoaded = true;

  const RULES_KEY = "pureviewRules";
  const PAUSED_KEY = "pureviewPausedPages";
  const CONSENT_KEY = "privacyConsentVersion";
  const REQUIRED_CONSENT_VERSION = 1;
  const HIDDEN_ATTRIBUTE = "data-pureview-hidden";
  let pageKey = null;
  let documentElement = null;

  let activeRule = null;
  let activeTargets = [];
  let filterPaused = false;
  let observer = null;
  let picker = null;
  let scheduled = false;
  let initialized = false;

  function storageGet(key) {
    return new Promise((resolve) => chrome.storage.local.get(key, resolve));
  }

  function storageSet(value) {
    return new Promise((resolve) => chrome.storage.local.set(value, resolve));
  }

  function normalizeRule(rule) {
    if (!rule || typeof rule !== "object") return null;

    if (Array.isArray(rule.blocks)) {
      const blocks = rule.blocks.filter(
        (block) => block && typeof block.selector === "string" && block.selector,
      );
      return blocks.length ? {...rule, blocks} : null;
    }

    if (typeof rule.selector === "string" && rule.selector) {
      return {
        blocks: [
          {
            selector: rule.selector,
            label: rule.label || "element",
            savedAt: rule.savedAt || new Date().toISOString(),
          },
        ],
        updatedAt: rule.savedAt || new Date().toISOString(),
      };
    }

    return null;
  }

  function cloneRule(rule) {
    const normalized = normalizeRule(rule);
    if (!normalized) return null;
    return {...normalized, blocks: normalized.blocks.map((block) => ({...block}))};
  }

  function isUnique(selector) {
    try {
      return document.querySelectorAll(selector).length === 1;
    } catch (_error) {
      return false;
    }
  }

  function selectorFor(element) {
    if (!(element instanceof Element)) {
      throw new TypeError("A DOM element is required for selection");
    }

    if (element.id) {
      const idSelector = `#${CSS.escape(element.id)}`;
      if (isUnique(idSelector)) return idSelector;
    }

    for (const attribute of ["data-testid", "data-test", "aria-label"]) {
      const value = element.getAttribute(attribute);
      if (!value) continue;
      const candidate = `${element.localName}[${attribute}="${CSS.escape(value)}"]`;
      if (isUnique(candidate)) return candidate;
    }

    const path = [];
    let current = element;
    while (current && current !== document.documentElement) {
      let part = current.localName;
      if (current.id) {
        path.unshift(`#${CSS.escape(current.id)}`);
        break;
      }

      const stableClasses = [...current.classList]
        .filter((name) => !name.startsWith("pureview-"))
        .filter((name) => !/\d{5,}/.test(name))
        .slice(0, 2);
      if (stableClasses.length) {
        const withClasses = `${part}.${stableClasses.map(CSS.escape).join(".")}`;
        if (isUnique(withClasses)) return withClasses;
        part = withClasses;
      }

      const siblings = current.parentElement
        ? [...current.parentElement.children].filter(
            (sibling) => sibling.localName === current.localName,
          )
        : [];
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }

      path.unshift(part);
      const candidate = path.join(" > ");
      if (isUnique(candidate)) return candidate;
      current = current.parentElement;
    }
    return path.join(" > ");
  }

  function clearHiddenBranches() {
    document.querySelectorAll(`[${HIDDEN_ATTRIBUTE}]`).forEach((element) => {
      element.removeAttribute(HIDDEN_ATTRIBUTE);
    });
  }

  function clearIsolation() {
    clearHiddenBranches();
    documentElement.removeAttribute("data-pureview-loading");
    activeTargets = [];
  }

  function hideSiblingBranches(targets) {
    const allowedChildren = new Map();

    for (const target of targets) {
      let branch = target;
      while (branch && branch !== documentElement) {
        const parent = branch.parentElement;
        if (!parent) break;
        if (!allowedChildren.has(parent)) allowedChildren.set(parent, new Set());
        allowedChildren.get(parent).add(branch);
        branch = parent;
      }
    }

    for (const [parent, allowed] of allowedChildren) {
      const parentIsInsideSelectedBlock = targets.some(
        (target) => target === parent || target.contains(parent),
      );
      if (parentIsInsideSelectedBlock) continue;

      for (const child of parent.children) {
        if (!allowed.has(child) && !child.id?.startsWith("pureview-")) {
          child.setAttribute(HIDDEN_ATTRIBUTE, "true");
        }
      }
    }
  }

  function applyRule() {
    scheduled = false;
    if (picker) return;
    if (filterPaused || !activeRule) {
      clearIsolation();
      return;
    }

    const targets = activeRule.blocks
      .map((block) => {
        try {
          return document.querySelector(block.selector);
        } catch (_error) {
          return null;
        }
      })
      .filter(Boolean);

    if (!targets.length) {
      if (activeTargets.length) clearIsolation();
      return;
    }

    clearHiddenBranches();
    activeTargets = targets;
    hideSiblingBranches(targets);
    documentElement.removeAttribute("data-pureview-loading");
  }

  function scheduleApplyRule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(applyRule);
  }

  function watchPage() {
    observer?.disconnect();
    observer = new MutationObserver(scheduleApplyRule);
    observer.observe(documentElement, {childList: true, subtree: true});
  }

  function stopWatchingPage() {
    observer?.disconnect();
    observer = null;
  }

  function showToast(message) {
    document.getElementById("pureview-toast")?.remove();
    const toast = document.createElement("div");
    toast.id = "pureview-toast";
    toast.textContent = message;
    document.documentElement.append(toast);
    window.setTimeout(() => toast.remove(), 4500);
  }

  function isPureViewUi(element) {
    let current = element;
    while (current instanceof Element) {
      if (current.id?.startsWith("pureview-")) return true;
      current = current.parentElement;
    }
    return false;
  }

  function clearSelectedMarkers() {
    document.querySelectorAll(".pureview-picker-selected").forEach((element) => {
      element.classList.remove("pureview-picker-selected");
    });
  }

  function updatePickerUi(state) {
    clearSelectedMarkers();
    for (const block of state.draftBlocks) {
      try {
        document.querySelector(block.selector)?.classList.add("pureview-picker-selected");
      } catch (_error) {
        // Invalid stored selectors remain listed but cannot be marked on the page.
      }
    }
    state.count.textContent = `${state.draftBlocks.length} selected`;
  }

  function stopPicker() {
    if (!picker) return;
    picker.hovered?.classList.remove("pureview-picker-hover");
    clearSelectedMarkers();
    document.removeEventListener("mouseover", picker.onMouseOver, true);
    document.removeEventListener("click", picker.onClick, true);
    document.removeEventListener("keydown", picker.onKeyDown, true);
    picker.toolbar.remove();
    picker = null;
  }

  function cancelPicker() {
    if (!picker) return;
    const previousRule = picker.originalRule;
    const wasPaused = picker.wasPaused;
    stopPicker();
    activeRule = previousRule;
    filterPaused = wasPaused;
    if (activeRule && !filterPaused) {
      watchPage();
      scheduleApplyRule();
    } else {
      stopWatchingPage();
      clearIsolation();
    }
    showToast("Selection changes canceled.");
  }

  async function finishPicker() {
    const state = picker;
    if (!state || state.busy) return;
    state.busy = true;
    state.done.disabled = true;
    state.cancel.disabled = true;

    try {
      const settings = await storageGet([RULES_KEY, PAUSED_KEY]);
      const pureviewRules = settings[RULES_KEY] || {};
      const pausedPages = settings[PAUSED_KEY] || {};
      const blocks = state.draftBlocks.map((block) => ({...block}));

      if (blocks.length) {
        activeRule = {blocks, updatedAt: new Date().toISOString()};
        pureviewRules[pageKey] = activeRule;
      } else {
        activeRule = null;
        delete pureviewRules[pageKey];
      }
      delete pausedPages[pageKey];

      await storageSet({[RULES_KEY]: pureviewRules, [PAUSED_KEY]: pausedPages});
      filterPaused = false;
      stopPicker();

      if (activeRule) {
        watchPage();
        applyRule();
        showToast(`Selection saved. ${blocks.length} element${blocks.length === 1 ? "" : "s"} visible.`);
      } else {
        stopWatchingPage();
        clearIsolation();
        showToast("Page filter removed because no elements are selected.");
      }
    } catch (_error) {
      state.busy = false;
      state.done.disabled = false;
      state.cancel.disabled = false;
      showToast("PureView could not save the selection. Please try again.");
    }
  }

  function startPicker() {
    stopPicker();
    stopWatchingPage();
    clearIsolation();

    const originalRule = cloneRule(activeRule);
    const state = {
      hovered: null,
      children: [],
      originalRule,
      draftBlocks: originalRule?.blocks.map((block) => ({...block})) || [],
      wasPaused: filterPaused,
      busy: false,
    };

    const toolbar = document.createElement("div");
    toolbar.id = "pureview-picker-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "PureView selection controls");

    const instructions = document.createElement("span");
    instructions.id = "pureview-picker-instructions";
    instructions.textContent = "Click elements to add or remove · ↑ parent · ↓ back";

    const count = document.createElement("strong");
    count.id = "pureview-picker-count";

    const done = document.createElement("button");
    done.id = "pureview-picker-done";
    done.type = "button";
    done.textContent = "Done";

    const cancel = document.createElement("button");
    cancel.id = "pureview-picker-cancel";
    cancel.type = "button";
    cancel.textContent = "Cancel";

    toolbar.append(instructions, count, done, cancel);
    document.documentElement.append(toolbar);
    Object.assign(state, {toolbar, count, done, cancel});

    state.setHovered = (element, resetChildren = true) => {
      if (
        !(element instanceof Element) ||
        element === documentElement ||
        isPureViewUi(element)
      ) {
        return;
      }
      state.hovered?.classList.remove("pureview-picker-hover");
      state.hovered = element;
      state.hovered.classList.add("pureview-picker-hover");
      if (resetChildren) state.children = [];
    };

    state.onMouseOver = (event) => state.setHovered(event.target);

    state.onClick = (event) => {
      if (isPureViewUi(event.target) || !(state.hovered instanceof Element)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state.busy) return;

      const selected = state.hovered;
      const selector = selectorFor(selected);
      if (!selector) return;
      const existingIndex = state.draftBlocks.findIndex(
        (block) => block.selector === selector,
      );

      if (existingIndex >= 0) {
        state.draftBlocks.splice(existingIndex, 1);
      } else {
        state.draftBlocks.push({
          selector,
          label: selected.getAttribute("aria-label") || selected.id || selected.localName,
          savedAt: new Date().toISOString(),
        });
      }
      updatePickerUi(state);
    };

    state.onKeyDown = (event) => {
      if (state.busy) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancelPicker();
        return;
      }

      if (event.key === "ArrowUp" && state.hovered?.parentElement) {
        const parent = state.hovered.parentElement;
        if (parent !== document.documentElement && parent !== document.body) {
          event.preventDefault();
          event.stopImmediatePropagation();
          state.children.push(state.hovered);
          state.setHovered(parent, false);
        }
        return;
      }

      if (event.key === "ArrowDown" && state.children.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        state.setHovered(state.children.pop(), false);
      }
    };

    done.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      void finishPicker();
    });
    cancel.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      cancelPicker();
    });

    picker = state;
    updatePickerUi(state);
    document.addEventListener("mouseover", state.onMouseOver, true);
    document.addEventListener("click", state.onClick, true);
    document.addEventListener("keydown", state.onKeyDown, true);
  }

  async function refreshState() {
    const settings = await storageGet([RULES_KEY, PAUSED_KEY]);
    activeRule = normalizeRule((settings[RULES_KEY] || {})[pageKey]);
    filterPaused = Boolean((settings[PAUSED_KEY] || {})[pageKey]);

    if (filterPaused || !activeRule) {
      stopWatchingPage();
      clearIsolation();
    } else {
      watchPage();
      applyRule();
    }
  }

  function setPaused(paused) {
    stopPicker();
    filterPaused = Boolean(paused);
    if (filterPaused) {
      stopWatchingPage();
      clearIsolation();
    } else if (activeRule) {
      watchPage();
      applyRule();
    }
  }

  function initialize() {
    if (initialized) return;
    initialized = true;
    pageKey = `${location.origin}${location.pathname}`;
    documentElement = document.documentElement;
    documentElement.setAttribute("data-pureview-loading", "true");

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "PUREVIEW_START_PICKER") {
        startPicker();
        sendResponse({ok: true});
        return;
      }
      if (message?.type === "PUREVIEW_REFRESH") {
        refreshState()
          .then(() => sendResponse({ok: true}))
          .catch((error) => sendResponse({ok: false, error: error.message}));
        return true;
      }
      if (message?.type === "PUREVIEW_SET_PAUSED") {
        setPaused(message.paused);
        sendResponse({ok: true});
        return;
      }
      if (message?.type === "PUREVIEW_CLEAR_SITE") {
        activeRule = null;
        filterPaused = false;
        stopPicker();
        stopWatchingPage();
        clearIsolation();
        sendResponse({ok: true});
      }
    });

    storageGet([RULES_KEY, PAUSED_KEY]).then(async (settings) => {
      const pureviewRules = settings[RULES_KEY] || {};
      const storedRule = pureviewRules[pageKey] || null;
      activeRule = normalizeRule(storedRule);
      filterPaused = Boolean((settings[PAUSED_KEY] || {})[pageKey]);
      if (!activeRule || filterPaused) {
        stopWatchingPage();
        documentElement.removeAttribute("data-pureview-loading");
        return;
      }

      if (!Array.isArray(storedRule.blocks)) {
        pureviewRules[pageKey] = activeRule;
        await storageSet({[RULES_KEY]: pureviewRules});
      }

      watchPage();
      scheduleApplyRule();
      window.setTimeout(() => {
        if (!activeTargets.length && !picker && !filterPaused) {
          documentElement.removeAttribute("data-pureview-loading");
          showToast("PureView could not find the selected elements. The full page is shown.");
        } else if (
          activeRule &&
          activeTargets.length < activeRule.blocks.length &&
          !picker &&
          !filterPaused
        ) {
          showToast("Some selected elements were not found. Available elements are shown.");
        }
      }, 8000);
    });
  }

  storageGet(CONSENT_KEY).then((settings) => {
    if (settings[CONSENT_KEY] === REQUIRED_CONSENT_VERSION) initialize();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes[CONSENT_KEY]?.newValue === REQUIRED_CONSENT_VERSION) initialize();
    if (!initialized || picker) return;

    let shouldApply = false;
    if (changes[RULES_KEY]) {
      activeRule = normalizeRule((changes[RULES_KEY].newValue || {})[pageKey]);
      shouldApply = true;
    }
    if (changes[PAUSED_KEY]) {
      filterPaused = Boolean((changes[PAUSED_KEY].newValue || {})[pageKey]);
      shouldApply = true;
    }
    if (shouldApply) {
      if (filterPaused || !activeRule) {
        stopWatchingPage();
        clearIsolation();
      } else {
        watchPage();
        applyRule();
      }
    }
  });
})();
