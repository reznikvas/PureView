(() => {
  "use strict";

  // SPDX-License-Identifier: GPL-3.0-only

  const RULES_KEY = "pureviewRules";
  const PAUSED_KEY = "pureviewPausedPages";
  const CONSENT_KEY = "privacyConsentVersion";
  const REQUIRED_CONSENT_VERSION = 1;
  const version = document.getElementById("version");
  const status = document.getElementById("status");
  const selectButton = document.getElementById("select");
  const pauseButton = document.getElementById("pause");
  const clearButton = document.getElementById("clear");
  const consentButton = document.getElementById("consent");
  const rulesSection = document.getElementById("rules");
  const count = document.getElementById("count");
  const blockList = document.getElementById("block-list");
  let tabId = null;
  let pageOrigin = null;
  let pageKey = null;
  let hasSiteAccess = false;
  let rules = {};
  let pausedPages = {};

  version.textContent = `v${chrome.runtime.getManifest().version}`;

  function normalizeBlocks(rule) {
    if (Array.isArray(rule?.blocks)) {
      return rule.blocks.filter(
        (block) => block && typeof block.selector === "string" && block.selector,
      );
    }
    if (typeof rule?.selector === "string" && rule.selector) {
      return [{selector: rule.selector, label: rule.label || "element", savedAt: rule.savedAt}];
    }
    return [];
  }

  function belongsToCurrentSite(key) {
    try {
      return new URL(key).origin === pageOrigin;
    } catch (_error) {
      return false;
    }
  }

  function send(message) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(response);
      });
    });
  }

  async function sendIfAvailable(message) {
    try {
      await send(message);
    } catch (_error) {
      // Stored changes remain valid if the content script is temporarily absent.
    }
  }

  async function callBackground(message) {
    const response = await chrome.runtime.sendMessage(message);
    if (!response?.ok) throw new Error(response?.error || "PureView could not update site access.");
  }

  async function enableCurrentSite() {
    const granted = await chrome.permissions.request({origins: [`${pageOrigin}/*`]});
    if (!granted) throw new Error("Site access was not granted.");
    await callBackground({type: "PUREVIEW_ENABLE_SITE", origin: pageOrigin, tabId});
    hasSiteAccess = true;
  }

  function currentBlocks() {
    return normalizeBlocks(rules[pageKey]);
  }

  function renderBlocks(blocks) {
    blockList.replaceChildren();
    for (const block of blocks) {
      const item = document.createElement("li");
      const details = document.createElement("span");
      details.className = "block-details";
      const label = document.createElement("span");
      label.className = "block-label";
      label.textContent = block.label || "element";
      const selector = document.createElement("code");
      selector.className = "block-selector";
      selector.textContent = block.selector;
      selector.title = block.selector;
      const remove = document.createElement("button");
      remove.className = "remove-block";
      remove.type = "button";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", `Remove ${block.label || block.selector}`);
      remove.addEventListener("click", () => void removeBlock(block.selector));
      details.append(label, selector);
      item.append(details, remove);
      blockList.append(item);
    }
  }

  function render() {
    const blocks = currentBlocks();
    const siteRuleCount = Object.keys(rules).filter(belongsToCurrentSite).length;
    const paused = blocks.length > 0 && Boolean(pausedPages[pageKey]);

    if (blocks.length) {
      status.textContent = `Selected elements on this page: ${blocks.length}. Filter is ${paused ? "paused" : "active"}.`;
      selectButton.textContent = "Edit page selection";
    } else if (siteRuleCount) {
      status.textContent = `Saved rules on other pages of this site: ${siteRuleCount}.`;
      selectButton.textContent = "Select page elements";
    } else if (hasSiteAccess) {
      status.textContent = "Site access is enabled, but no filters are saved.";
      selectButton.textContent = "Select page elements";
    } else {
      status.textContent = "No filters have been created for this site.";
      selectButton.textContent = "Select page elements";
    }

    count.textContent = String(blocks.length);
    rulesSection.hidden = blocks.length === 0;
    pauseButton.hidden = blocks.length === 0;
    pauseButton.disabled = blocks.length === 0;
    pauseButton.textContent = paused ? "Resume filter" : "Pause filter";
    clearButton.disabled = siteRuleCount === 0 && !hasSiteAccess;
    renderBlocks(blocks);
  }

  async function removeBlock(selectorToRemove) {
    try {
      const settings = await chrome.storage.local.get([RULES_KEY, PAUSED_KEY]);
      rules = settings[RULES_KEY] || {};
      pausedPages = settings[PAUSED_KEY] || {};
      const remaining = normalizeBlocks(rules[pageKey]).filter(
        (block) => block.selector !== selectorToRemove,
      );

      if (remaining.length) {
        rules[pageKey] = {blocks: remaining, updatedAt: new Date().toISOString()};
      } else {
        delete rules[pageKey];
        delete pausedPages[pageKey];
      }

      await chrome.storage.local.set({[RULES_KEY]: rules, [PAUSED_KEY]: pausedPages});
      await sendIfAvailable({type: "PUREVIEW_REFRESH"});
      render();
    } catch (error) {
      status.textContent = error.message;
    }
  }

  async function initialize() {
    const consent = await chrome.storage.local.get(CONSENT_KEY);
    if (consent[CONSENT_KEY] !== REQUIRED_CONSENT_VERSION) {
      status.textContent = "Review and accept the privacy disclosure to enable PureView.";
      selectButton.hidden = true;
      pauseButton.hidden = true;
      clearButton.hidden = true;
      rulesSection.hidden = true;
      consentButton.hidden = false;
      return;
    }

    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    tabId = tab?.id;
    if (!tabId || !/^https?:/.test(tab.url || "")) {
      throw new Error("Element selection is unavailable on this browser page.");
    }

    const pageUrl = new URL(tab.url);
    pageOrigin = pageUrl.origin;
    pageKey = `${pageOrigin}${pageUrl.pathname}`;

    const [settings, access] = await Promise.all([
      chrome.storage.local.get([RULES_KEY, PAUSED_KEY]),
      chrome.permissions.contains({origins: [`${pageOrigin}/*`]}),
    ]);
    rules = settings[RULES_KEY] || {};
    pausedPages = settings[PAUSED_KEY] || {};
    hasSiteAccess = access;
    render();
    selectButton.disabled = false;
  }

  selectButton.addEventListener("click", async () => {
    try {
      await enableCurrentSite();
      await send({type: "PUREVIEW_START_PICKER"});
      window.close();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  pauseButton.addEventListener("click", async () => {
    try {
      const paused = !Boolean(pausedPages[pageKey]);
      if (paused) pausedPages[pageKey] = true;
      else delete pausedPages[pageKey];
      await chrome.storage.local.set({[PAUSED_KEY]: pausedPages});
      await sendIfAvailable({type: "PUREVIEW_SET_PAUSED", paused});
      render();
    } catch (error) {
      status.textContent = error.message;
    }
  });

  consentButton.addEventListener("click", async () => {
    await chrome.tabs.create({url: chrome.runtime.getURL("onboarding.html")});
    window.close();
  });

  clearButton.addEventListener("click", async () => {
    try {
      const settings = await chrome.storage.local.get([RULES_KEY, PAUSED_KEY]);
      rules = settings[RULES_KEY] || {};
      pausedPages = settings[PAUSED_KEY] || {};
      for (const key of Object.keys(rules)) {
        if (belongsToCurrentSite(key)) delete rules[key];
      }
      for (const key of Object.keys(pausedPages)) {
        if (belongsToCurrentSite(key)) delete pausedPages[key];
      }
      await chrome.storage.local.set({[RULES_KEY]: rules, [PAUSED_KEY]: pausedPages});
      await sendIfAvailable({type: "PUREVIEW_CLEAR_SITE"});
      await callBackground({type: "PUREVIEW_DISABLE_SITE", origin: pageOrigin});
      hasSiteAccess = false;
      render();
      status.textContent = "All filters for this site have been removed.";
    } catch (error) {
      status.textContent = error.message;
    }
  });

  initialize().catch((error) => {
    status.textContent = error.message;
    selectButton.disabled = true;
    pauseButton.disabled = true;
    clearButton.disabled = true;
  });
})();
