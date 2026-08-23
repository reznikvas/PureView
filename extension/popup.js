(() => {
  "use strict";

  // SPDX-License-Identifier: GPL-3.0-only

  const RULES_KEY = "pureviewRules";
  const CONSENT_KEY = "privacyConsentVersion";
  const REQUIRED_CONSENT_VERSION = 1;
  const status = document.getElementById("status");
  const selectButton = document.getElementById("select");
  const clearButton = document.getElementById("clear");
  const consentButton = document.getElementById("consent");
  let tabId = null;
  let pageOrigin = null;
  let pageKey = null;

  function blockCount(rule) {
    if (Array.isArray(rule?.blocks)) return rule.blocks.length;
    return typeof rule?.selector === "string" && rule.selector ? 1 : 0;
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

  async function callBackground(message) {
    const response = await chrome.runtime.sendMessage(message);
    if (!response?.ok) throw new Error(response?.error || "PureView could not update site access.");
  }

  async function enableCurrentSite() {
    const granted = await chrome.permissions.request({origins: [`${pageOrigin}/*`]});
    if (!granted) throw new Error("Site access was not granted.");
    await callBackground({type: "PUREVIEW_ENABLE_SITE", origin: pageOrigin, tabId});
  }

  async function initialize() {
    const consent = await chrome.storage.local.get(CONSENT_KEY);
    if (consent[CONSENT_KEY] !== REQUIRED_CONSENT_VERSION) {
      status.textContent = "Review and accept the privacy disclosure to enable PureView.";
      selectButton.hidden = true;
      clearButton.hidden = true;
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

    const [{pureviewRules = {}}, hasSiteAccess] = await Promise.all([
      chrome.storage.local.get(RULES_KEY),
      chrome.permissions.contains({origins: [`${pageOrigin}/*`]}),
    ]);
    const siteRuleCount = Object.keys(pureviewRules).filter(belongsToCurrentSite).length;
    const currentBlockCount = blockCount(pureviewRules[pageKey]);

    if (currentBlockCount) {
      status.textContent = `Selected elements on this page: ${currentBlockCount}.`;
      selectButton.textContent = "Add another element";
    } else if (siteRuleCount) {
      status.textContent = `Saved rules on other pages of this site: ${siteRuleCount}.`;
    } else if (hasSiteAccess) {
      status.textContent = "Site access is enabled, but no filters are saved.";
    } else {
      status.textContent = "No filters have been created for this site.";
    }
    clearButton.disabled = siteRuleCount === 0 && !hasSiteAccess;
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

  consentButton.addEventListener("click", async () => {
    await chrome.tabs.create({url: chrome.runtime.getURL("onboarding.html")});
    window.close();
  });

  clearButton.addEventListener("click", async () => {
    try {
      const {pureviewRules = {}} = await chrome.storage.local.get(RULES_KEY);
      for (const key of Object.keys(pureviewRules)) {
        if (belongsToCurrentSite(key)) delete pureviewRules[key];
      }
      await chrome.storage.local.set({[RULES_KEY]: pureviewRules});
      try {
        await send({type: "PUREVIEW_CLEAR_SITE"});
      } catch (_error) {
        // The content script may not be present if site access was revoked manually.
      }
      await callBackground({type: "PUREVIEW_DISABLE_SITE", origin: pageOrigin});
      status.textContent = "All filters for this site have been removed.";
      selectButton.textContent = "Select an element";
      clearButton.disabled = true;
    } catch (error) {
      status.textContent = error.message;
    }
  });

  initialize().catch((error) => {
    status.textContent = error.message;
    selectButton.disabled = true;
    clearButton.disabled = true;
  });
})();
