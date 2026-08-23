(() => {
  "use strict";

  // SPDX-License-Identifier: GPL-3.0-only

  if (globalThis.__pureViewContentLoaded) return;
  globalThis.__pureViewContentLoaded = true;

  const RULES_KEY = "pureviewRules";
  const CONSENT_KEY = "privacyConsentVersion";
  const REQUIRED_CONSENT_VERSION = 1;
  const HIDDEN_ATTRIBUTE = "data-pureview-hidden";
  let pageKey = null;
  let documentElement = null;

  let activeRule = null;
  let activeTargets = [];
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
    if (!activeRule || picker) return;
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

  function showToast(message) {
    document.getElementById("pureview-toast")?.remove();
    const toast = document.createElement("div");
    toast.id = "pureview-toast";
    toast.textContent = message;
    document.documentElement.append(toast);
    window.setTimeout(() => toast.remove(), 4500);
  }

  function stopPicker() {
    if (!picker) return;
    picker.hovered?.classList.remove("pureview-picker-hover");
    document.removeEventListener("mouseover", picker.onMouseOver, true);
    document.removeEventListener("click", picker.onClick, true);
    document.removeEventListener("keydown", picker.onKeyDown, true);
    document.getElementById("pureview-picker-help")?.remove();
    picker = null;
  }

  function startPicker() {
    stopPicker();
    clearIsolation();

    const state = {hovered: null, children: []};
    const help = document.createElement("div");
    help.id = "pureview-picker-help";
    help.textContent = "PureView: click to save · ↑ parent · ↓ back · Esc to cancel";
    document.documentElement.append(help);

    state.setHovered = (element, resetChildren = true) => {
      if (!(element instanceof Element) || element.id?.startsWith("pureview-")) return;
      state.hovered?.classList.remove("pureview-picker-hover");
      state.hovered = element;
      state.hovered.classList.add("pureview-picker-hover");
      if (resetChildren) state.children = [];
    };

    state.onMouseOver = (event) => {
      const element = event.target;
      state.setHovered(element);
    };

    state.onClick = async (event) => {
      if (!(state.hovered instanceof Element)) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const selected = state.hovered;
      const selector = selectorFor(selected);
      const {pureviewRules = {}} = await storageGet(RULES_KEY);
      const currentRule = normalizeRule(pureviewRules[pageKey]) || {blocks: []};
      const alreadySaved = currentRule.blocks.some((block) => block.selector === selector);

      if (alreadySaved) {
        activeRule = currentRule;
        stopPicker();
        showToast("This element is already on the allowlist.");
        return;
      }

      currentRule.blocks.push({
        selector,
        label: selected.getAttribute("aria-label") || selected.id || selected.localName,
        savedAt: new Date().toISOString(),
      });
      currentRule.updatedAt = new Date().toISOString();
      pureviewRules[pageKey] = currentRule;
      await storageSet({[RULES_KEY]: pureviewRules});
      activeRule = currentRule;
      stopPicker();
      showToast(
        `Element added. Selected: ${currentRule.blocks.length}. Reload the page.`,
      );
    };

    state.onKeyDown = (event) => {
      if (event.key === "Escape") {
        stopPicker();
        if (activeRule) scheduleApplyRule();
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

    picker = state;
    document.addEventListener("mouseover", state.onMouseOver, true);
    document.addEventListener("click", state.onClick, true);
    document.addEventListener("keydown", state.onKeyDown, true);
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
      if (message?.type === "PUREVIEW_CLEAR_SITE") {
        activeRule = null;
        stopPicker();
        clearIsolation();
        sendResponse({ok: true});
        return;
      }
    });

    storageGet(RULES_KEY).then(async ({pureviewRules = {}}) => {
      const storedRule = pureviewRules[pageKey] || null;
      activeRule = normalizeRule(storedRule);
      if (!activeRule) {
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
        if (!activeTargets.length && !picker) {
          documentElement.removeAttribute("data-pureview-loading");
          showToast("PureView could not find the selected elements. The full page is shown.");
        } else if (activeTargets.length < activeRule.blocks.length && !picker) {
          showToast("Some selected elements were not found. Available elements are shown.");
        }
      }, 8000);
    });
  }

  storageGet(CONSENT_KEY).then((settings) => {
    if (settings[CONSENT_KEY] === REQUIRED_CONSENT_VERSION) initialize();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (
      areaName === "local" &&
      changes[CONSENT_KEY]?.newValue === REQUIRED_CONSENT_VERSION
    ) {
      initialize();
    }
  });
})();
