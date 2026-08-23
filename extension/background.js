"use strict";

// SPDX-License-Identifier: GPL-3.0-only

const CONSENT_KEY = "privacyConsentVersion";
const REQUIRED_CONSENT_VERSION = 1;

function normalizeOrigin(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value) {
    throw new Error("PureView can only be enabled for an HTTP or HTTPS origin");
  }
  return url.origin;
}

function scriptIdFor(origin) {
  let hash = 2166136261;
  for (const character of origin) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `pureview-${(hash >>> 0).toString(16)}`;
}

async function enableSite(originValue, tabId) {
  const origin = normalizeOrigin(originValue);
  const id = scriptIdFor(origin);
  const matches = [`${origin}/*`];
  const existing = await chrome.scripting.getRegisteredContentScripts({ids: [id]});

  if (!existing.length) {
    await chrome.scripting.registerContentScripts([
      {
        id,
        matches,
        css: ["content.css"],
        js: ["content.js"],
        runAt: "document_start",
        persistAcrossSessions: true,
      },
    ]);
  }

  await chrome.scripting.insertCSS({target: {tabId}, files: ["content.css"]});
  await chrome.scripting.executeScript({target: {tabId}, files: ["content.js"]});
}

async function disableSite(originValue) {
  const origin = normalizeOrigin(originValue);
  const id = scriptIdFor(origin);
  const existing = await chrome.scripting.getRegisteredContentScripts({ids: [id]});
  if (existing.length) {
    await chrome.scripting.unregisterContentScripts({ids: [id]});
  }
  await chrome.permissions.remove({origins: [`${origin}/*`]});
}

chrome.runtime.onInstalled.addListener(async ({reason}) => {
  if (reason !== "install" && reason !== "update") return;

  const settings = await chrome.storage.local.get(CONSENT_KEY);
  if (settings[CONSENT_KEY] === REQUIRED_CONSENT_VERSION) return;

  await chrome.tabs.create({url: chrome.runtime.getURL("onboarding.html")});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  let operation = null;
  if (message?.type === "PUREVIEW_ENABLE_SITE") {
    operation = enableSite(message.origin, message.tabId);
  } else if (message?.type === "PUREVIEW_DISABLE_SITE") {
    operation = disableSite(message.origin);
  } else {
    return false;
  }

  operation
    .then(() => sendResponse({ok: true}))
    .catch((error) => sendResponse({ok: false, error: error.message}));
  return true;
});
