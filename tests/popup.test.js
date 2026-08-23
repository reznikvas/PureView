"use strict";

// SPDX-License-Identifier: GPL-3.0-only

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const popupScript = fs.readFileSync(
  new URL("../extension/popup.js", `file://${__filename}`),
  "utf8",
);

function element() {
  const listeners = {};
  return {
    disabled: false,
    hidden: false,
    textContent: "",
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    async dispatch(type) {
      return listeners[type]?.();
    },
  };
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

async function main() {
  const elements = {
    status: element(),
    select: element(),
    clear: element(),
    consent: element(),
  };
  elements.select.disabled = true;

  let storedRules = {};
  const backgroundMessages = [];
  const context = {
    URL,
    document: {getElementById: (id) => elements[id]},
    window: {close: () => {}},
    chrome: {
      storage: {
        local: {
          get: async (key) => {
            if (key === "privacyConsentVersion") return {privacyConsentVersion: 1};
            if (key === "pureviewRules") return {pureviewRules: storedRules};
            return {};
          },
          set: async ({pureviewRules}) => { storedRules = pureviewRules; },
        },
      },
      tabs: {
        query: async () => [{id: 7, url: "https://test.invalid/page"}],
        sendMessage: (_tabId, _message, callback) => callback({ok: true}),
        create: async () => {},
      },
      permissions: {
        contains: async () => true,
        request: async () => true,
      },
      runtime: {
        lastError: null,
        getURL: (path) => `chrome-extension://test/${path}`,
        sendMessage: async (message) => {
          backgroundMessages.push(message);
          return {ok: true};
        },
      },
    },
    console,
  };

  vm.runInNewContext(popupScript, context);
  await settle();

  assert.equal(elements.select.disabled, false);
  assert.equal(elements.clear.disabled, false);
  assert.equal(elements.status.textContent, "Site access is enabled, but no filters are saved.");

  await elements.clear.dispatch("click");
  assert.equal(elements.clear.disabled, true);
  assert.equal(elements.status.textContent, "All filters for this site have been removed.");
  assert.equal(backgroundMessages.at(-1).type, "PUREVIEW_DISABLE_SITE");
  assert.equal(backgroundMessages.at(-1).origin, "https://test.invalid");

  console.log("PureView popup tests: OK");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
