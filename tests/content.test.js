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
    this.classList = {
      [Symbol.iterator]: function* iterator() {},
      add() {},
      remove() {},
    };
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
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

async function runContentScript(rule, consentVersion = 1) {
  const page = createPage();
  const writes = [];
  const selectorMap = new Map([
    ["#first", page.first],
    ["#first-branch", page.firstBranch],
    ["#second", page.second],
  ]);
  const rules = rule ? {"https://test.invalid/page": rule} : {};
  const storageState = {pureviewRules: rules};
  if (consentVersion !== null) storageState.privacyConsentVersion = consentVersion;

  const document = {
    documentElement: page.html,
    body: page.body,
    querySelector: (selector) => selectorMap.get(selector) || null,
    querySelectorAll: (selector) => {
      if (selector !== "[data-pureview-hidden]") return [];
      return descendants(page.html).filter((element) =>
        element.attributes.has("data-pureview-hidden"),
      );
    },
    addEventListener() {},
    removeEventListener() {},
    getElementById() {
      return null;
    },
  };

  const context = {
    chrome: {
      storage: {
        local: {
          get(_key, callback) {
            callback(storageState);
          },
          set(value, callback) {
            writes.push(value);
            callback();
          },
        },
        onChanged: {addListener() {}},
      },
      runtime: {onMessage: {addListener() {}}},
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
  await new Promise((resolve) => setImmediate(resolve));
  return {page, writes};
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
    null,
  );

  assert.equal(isHidden(page.advertisement), false);
  assert.equal(page.html.getAttribute("data-pureview-loading"), null);
  assert.equal(writes.length, 0);
}

async function main() {
  await testTwoIndependentBlocks();
  await testNestedBlockDoesNotNarrowParent();
  await testLegacyRuleMigration();
  await testConsentGate();
  console.log("PureView content tests: OK");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
