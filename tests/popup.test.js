"use strict";

// SPDX-License-Identifier: GPL-3.0-only

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const popupScript = fs.readFileSync(
  new URL("../extension/popup.js", `file://${__filename}`),
  "utf8",
);

class FakeElement {
  constructor() {
    this.listeners = new Map();
    this.children = [];
    this.disabled = false;
    this.hidden = false;
    this.textContent = "";
    this.className = "";
    this.attributes = new Map();
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  async dispatch(type) {
    const event = {preventDefault() {}, stopPropagation() {}};
    for (const listener of this.listeners.get(type) || []) await listener(event);
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

async function createHarness({storedRules = {}, storedPaused = {}, access = true} = {}) {
  const elements = Object.fromEntries(
    ["version", "status", "select", "pause", "clear", "consent", "rules", "count", "block-list"]
      .map((id) => [id, new FakeElement()]),
  );
  elements.select.disabled = true;
  const storageState = {
    privacyConsentVersion: 1,
    pureviewRules: structuredClone(storedRules),
    pureviewPausedPages: structuredClone(storedPaused),
  };
  const backgroundMessages = [];
  const tabMessages = [];

  function selectSettings(key) {
    if (Array.isArray(key)) {
      return Object.fromEntries(key.map((name) => [name, storageState[name]]));
    }
    return {[key]: storageState[key]};
  }

  const context = {
    URL,
    document: {
      getElementById: (id) => elements[id],
      createElement: () => new FakeElement(),
    },
    window: {close() {}},
    chrome: {
      storage: {
        local: {
          get: async (key) => structuredClone(selectSettings(key)),
          set: async (values) => Object.assign(storageState, structuredClone(values)),
        },
      },
      tabs: {
        query: async () => [{id: 7, url: "https://test.invalid/page"}],
        sendMessage: (_tabId, message, callback) => {
          tabMessages.push(message);
          callback({ok: true});
        },
        create: async () => {},
      },
      permissions: {
        contains: async () => access,
        request: async () => true,
      },
      runtime: {
        lastError: null,
        getManifest: () => ({version: "0.5.0"}),
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
  return {elements, storageState, backgroundMessages, tabMessages};
}

async function testRuleListPauseResumeAndRemoval() {
  const pageKey = "https://test.invalid/page";
  const harness = await createHarness({
    storedRules: {
      [pageKey]: {
        blocks: [
          {selector: "#first", label: "First"},
          {selector: "#second", label: "Second"},
        ],
      },
    },
  });

  assert.equal(harness.elements.select.disabled, false);
  assert.equal(harness.elements.version.textContent, "v0.5.0");
  assert.equal(harness.elements.status.textContent, "Selected elements on this page: 2. Filter is active.");
  assert.equal(harness.elements.count.textContent, "2");
  assert.equal(harness.elements["block-list"].children.length, 2);
  assert.equal(harness.elements.pause.hidden, false);
  assert.equal(harness.elements.pause.textContent, "Pause filter");

  await harness.elements.pause.dispatch("click");
  assert.equal(harness.storageState.pureviewPausedPages[pageKey], true);
  assert.equal(harness.elements.pause.textContent, "Resume filter");
  assert.equal(harness.tabMessages.at(-1).type, "PUREVIEW_SET_PAUSED");
  assert.equal(harness.tabMessages.at(-1).paused, true);

  await harness.elements.pause.dispatch("click");
  assert.equal(harness.storageState.pureviewPausedPages[pageKey], undefined);
  assert.equal(harness.elements.pause.textContent, "Pause filter");

  const firstRemove = harness.elements["block-list"].children[0].children[1];
  await firstRemove.dispatch("click");
  await settle();
  assert.deepEqual(
    harness.storageState.pureviewRules[pageKey].blocks.map((block) => block.selector),
    ["#second"],
  );
  assert.equal(harness.elements.count.textContent, "1");
  assert.equal(harness.tabMessages.at(-1).type, "PUREVIEW_REFRESH");

  const lastRemove = harness.elements["block-list"].children[0].children[1];
  await lastRemove.dispatch("click");
  await settle();
  assert.equal(harness.storageState.pureviewRules[pageKey], undefined);
  assert.equal(harness.elements.rules.hidden, true);
  assert.equal(harness.elements.pause.hidden, true);
}

async function testSiteResetPreservesOtherOrigins() {
  const harness = await createHarness({
    storedRules: {
      "https://test.invalid/page": {blocks: [{selector: "#first"}]},
      "https://test.invalid/other": {blocks: [{selector: "#second"}]},
      "https://other.invalid/page": {blocks: [{selector: "#third"}]},
    },
    storedPaused: {
      "https://test.invalid/page": true,
      "https://other.invalid/page": true,
    },
  });

  await harness.elements.clear.dispatch("click");
  assert.deepEqual(Object.keys(harness.storageState.pureviewRules), ["https://other.invalid/page"]);
  assert.deepEqual(Object.keys(harness.storageState.pureviewPausedPages), ["https://other.invalid/page"]);
  assert.equal(harness.elements.clear.disabled, true);
  assert.equal(harness.elements.status.textContent, "All filters for this site have been removed.");
  assert.equal(harness.backgroundMessages.at(-1).type, "PUREVIEW_DISABLE_SITE");
}

async function testNoRulesStatus() {
  const harness = await createHarness();
  assert.equal(harness.elements.status.textContent, "Site access is enabled, but no filters are saved.");
  assert.equal(harness.elements.clear.disabled, false);
  assert.equal(harness.elements.pause.hidden, true);
}

async function main() {
  await testRuleListPauseResumeAndRemoval();
  await testSiteResetPreservesOtherOrigins();
  await testNoRulesStatus();
  console.log("PureView popup tests: OK");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
