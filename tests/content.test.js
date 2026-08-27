"use strict";

// SPDX-License-Identifier: GPL-3.0-only

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const contentScript = fs.readFileSync(
  new URL("../extension/content.js", `file://${__filename}`),
  "utf8",
);

class FakeElement {
  constructor(localName, id = "") {
    this.localName = localName;
    this.id = id;
    this.parentElement = null;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this.textContent = "";
    this.disabled = false;
    this.type = "";
    this.classes = new Set();
    this.classList = {
      [Symbol.iterator]: () => this.classes.values(),
      add: (...names) => names.forEach((name) => this.classes.add(name)),
      remove: (...names) => names.forEach((name) => this.classes.delete(name)),
      contains: (name) => this.classes.has(name),
    };
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }

  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter(
      (child) => child !== this,
    );
    this.parentElement = null;
  }

  contains(candidate) {
    if (candidate === this) return true;
    return this.children.some((child) => child.contains(candidate));
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  async dispatch(type, event = eventFor(this)) {
    for (const listener of this.listeners.get(type) || []) await listener(event);
  }
}

function eventFor(target, extra = {}) {
  return {
    target,
    key: undefined,
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
    ...extra,
  };
}

function descendants(root) {
  return [root, ...root.children.flatMap(descendants)];
}

function createPage() {
  const html = new FakeElement("html");
  const head = new FakeElement("head");
  const body = new FakeElement("body");
  const firstBranch = new FakeElement("section", "first-branch");
  const first = new FakeElement("div", "first");
  const firstChild = new FakeElement("button", "first-child");
  const firstSibling = new FakeElement("aside", "first-sibling");
  const advertisement = new FakeElement("aside", "advertisement");
  const secondBranch = new FakeElement("section", "second-branch");
  const second = new FakeElement("div", "second");
  const secondSibling = new FakeElement("aside", "second-sibling");
  const footer = new FakeElement("footer");

  html.append(head, body);
  body.append(firstBranch, advertisement, secondBranch, footer);
  firstBranch.append(first, firstSibling);
  first.append(firstChild);
  secondBranch.append(second, secondSibling);

  return {
    html,
    head,
    body,
    firstBranch,
    first,
    firstChild,
    firstSibling,
    advertisement,
    secondBranch,
    second,
    secondSibling,
    footer,
  };
}

function matchingElements(root, selector) {
  const elements = descendants(root);
  if (selector === "[data-pureview-hidden]") {
    return elements.filter((element) => element.attributes.has("data-pureview-hidden"));
  }
  if (selector.startsWith("#")) {
    return elements.filter((element) => element.id === selector.slice(1));
  }
  if (selector.startsWith(".")) {
    return elements.filter((element) => element.classList.contains(selector.slice(1)));
  }
  return elements.filter((element) => element.localName === selector);
}

async function settle() {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

async function runContentScript(rule, {consentVersion = 1, paused = false} = {}) {
  const page = createPage();
  const writes = [];
  const documentListeners = new Map();
  let runtimeListener = null;
  const rules = rule ? {"https://test.invalid/page": structuredClone(rule)} : {};
  const storageState = {pureviewRules: rules, pureviewPausedPages: {}};
  if (paused) storageState.pureviewPausedPages["https://test.invalid/page"] = true;
  if (consentVersion !== null) storageState.privacyConsentVersion = consentVersion;

  function selectSettings(key) {
    if (Array.isArray(key)) {
      return Object.fromEntries(key.map((name) => [name, storageState[name]]));
    }
    return {[key]: storageState[key]};
  }

  const document = {
    documentElement: page.html,
    body: page.body,
    createElement: (name) => new FakeElement(name),
    querySelector: (selector) => matchingElements(page.html, selector)[0] || null,
    querySelectorAll: (selector) => matchingElements(page.html, selector),
    getElementById: (id) => descendants(page.html).find((element) => element.id === id) || null,
    addEventListener(type, listener) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(listener);
    },
    removeEventListener(type, listener) {
      documentListeners.set(
        type,
        (documentListeners.get(type) || []).filter((item) => item !== listener),
      );
    },
  };

  const context = {
    chrome: {
      storage: {
        local: {
          get(key, callback) {
            callback(selectSettings(key));
          },
          set(value, callback) {
            Object.assign(storageState, structuredClone(value));
            writes.push(structuredClone(value));
            callback();
          },
        },
        onChanged: {addListener() {}},
      },
      runtime: {
        onMessage: {
          addListener(listener) {
            runtimeListener = listener;
          },
        },
      },
    },
    CSS: {escape: (value) => value},
    document,
    Element: FakeElement,
    location: {origin: "https://test.invalid", pathname: "/page"},
    MutationObserver: class MutationObserver {
      observe() {}
      disconnect() {}
    },
    requestAnimationFrame: (callback) => callback(),
    window: {setTimeout() {}},
    console,
  };

  vm.runInNewContext(contentScript, context);
  await settle();

  async function sendMessage(message) {
    let response;
    runtimeListener?.(message, {}, (value) => { response = value; });
    await settle();
    return response;
  }

  async function dispatchDocument(type, event) {
    for (const listener of [...(documentListeners.get(type) || [])]) listener(event);
    await settle();
  }

  async function clickPageElement(element) {
    await dispatchDocument("mouseover", eventFor(element));
    await dispatchDocument("click", eventFor(element));
  }

  return {
    page,
    writes,
    storageState,
    document,
    sendMessage,
    clickPageElement,
  };
}

function isHidden(element) {
  return element.getAttribute("data-pureview-hidden") === "true";
}

async function testTwoIndependentBlocks() {
  const {page} = await runContentScript({
    blocks: [
      {selector: "#first", label: "first"},
      {selector: "#second", label: "second"},
    ],
  });

  assert.equal(isHidden(page.first), false);
  assert.equal(isHidden(page.second), false);
  assert.equal(isHidden(page.firstChild), false);
  assert.equal(isHidden(page.firstBranch), false);
  assert.equal(isHidden(page.secondBranch), false);
  assert.equal(isHidden(page.firstSibling), true);
  assert.equal(isHidden(page.secondSibling), true);
  assert.equal(isHidden(page.advertisement), true);
  assert.equal(isHidden(page.footer), true);
}

async function testNestedBlockDoesNotNarrowParent() {
  const {page} = await runContentScript({
    blocks: [
      {selector: "#first-branch", label: "parent"},
      {selector: "#first", label: "child"},
    ],
  });

  assert.equal(isHidden(page.firstBranch), false);
  assert.equal(isHidden(page.first), false);
  assert.equal(isHidden(page.firstSibling), false);
  assert.equal(isHidden(page.advertisement), true);
  assert.equal(isHidden(page.secondBranch), true);
}

async function testLegacyRuleMigration() {
  const {writes} = await runContentScript({
    selector: "#first",
    label: "legacy",
    savedAt: "2026-08-23T00:00:00.000Z",
  });

  assert.equal(writes.length, 1);
  const migrated = writes[0].pureviewRules["https://test.invalid/page"];
  assert.equal(migrated.blocks.length, 1);
  assert.equal(migrated.blocks[0].selector, "#first");
  assert.equal(migrated.blocks[0].label, "legacy");
}

async function testConsentGate() {
  const {page, writes} = await runContentScript(
    {blocks: [{selector: "#first", label: "first"}]},
    {consentVersion: null},
  );

  assert.equal(isHidden(page.advertisement), false);
  assert.equal(page.html.getAttribute("data-pureview-loading"), null);
  assert.equal(writes.length, 0);
}

async function testContinuousPickerTogglesAndSaves() {
  const harness = await runContentScript({
    blocks: [{selector: "#first", label: "first"}],
  });
  await harness.sendMessage({type: "PUREVIEW_START_PICKER"});

  assert.equal(harness.document.getElementById("pureview-picker-count").textContent, "1 selected");
  assert.equal(harness.page.first.classList.contains("pureview-picker-selected"), true);
  assert.equal(isHidden(harness.page.advertisement), false);

  await harness.clickPageElement(harness.page.second);
  assert.equal(harness.document.getElementById("pureview-picker-count").textContent, "2 selected");
  assert.equal(harness.writes.length, 0, "draft changes must not write storage");

  await harness.clickPageElement(harness.page.second);
  assert.equal(harness.document.getElementById("pureview-picker-count").textContent, "1 selected");
  await harness.clickPageElement(harness.page.second);
  await harness.document.getElementById("pureview-picker-done").dispatch("click");
  await settle();

  const saved = harness.storageState.pureviewRules["https://test.invalid/page"];
  assert.deepEqual(saved.blocks.map((block) => block.selector), ["#first", "#second"]);
  assert.equal(harness.document.getElementById("pureview-picker-toolbar"), null);
  assert.equal(isHidden(harness.page.advertisement), true);
  assert.equal(isHidden(harness.page.first), false);
  assert.equal(isHidden(harness.page.second), false);
}

async function testPickerCancelRestoresOriginalFilter() {
  const harness = await runContentScript({
    blocks: [{selector: "#first", label: "first"}],
  });
  await harness.sendMessage({type: "PUREVIEW_START_PICKER"});
  await harness.clickPageElement(harness.page.second);
  await harness.document.getElementById("pureview-picker-cancel").dispatch("click");
  await settle();

  const saved = harness.storageState.pureviewRules["https://test.invalid/page"];
  assert.deepEqual(saved.blocks.map((block) => block.selector), ["#first"]);
  assert.equal(isHidden(harness.page.first), false);
  assert.equal(isHidden(harness.page.secondBranch), true);
  assert.equal(harness.writes.length, 0);
}

async function testEmptySelectionRemovesPageRule() {
  const harness = await runContentScript({
    blocks: [{selector: "#first", label: "first"}],
  }, {paused: true});
  await harness.sendMessage({type: "PUREVIEW_START_PICKER"});
  await harness.clickPageElement(harness.page.first);
  await harness.document.getElementById("pureview-picker-done").dispatch("click");
  await settle();

  assert.equal(harness.storageState.pureviewRules["https://test.invalid/page"], undefined);
  assert.equal(harness.storageState.pureviewPausedPages["https://test.invalid/page"], undefined);
  assert.equal(isHidden(harness.page.advertisement), false);
}

async function testPauseAndResumeApplyImmediately() {
  const harness = await runContentScript({
    blocks: [{selector: "#first", label: "first"}],
  });
  assert.equal(isHidden(harness.page.advertisement), true);

  await harness.sendMessage({type: "PUREVIEW_SET_PAUSED", paused: true});
  assert.equal(isHidden(harness.page.advertisement), false);

  await harness.sendMessage({type: "PUREVIEW_SET_PAUSED", paused: false});
  assert.equal(isHidden(harness.page.advertisement), true);
}

async function main() {
  await testTwoIndependentBlocks();
  await testNestedBlockDoesNotNarrowParent();
  await testLegacyRuleMigration();
  await testConsentGate();
  await testContinuousPickerTogglesAndSaves();
  await testPickerCancelRestoresOriginalFilter();
  await testEmptySelectionRemovesPageRule();
  await testPauseAndResumeApplyImmediately();
  console.log("PureView content tests: OK");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
