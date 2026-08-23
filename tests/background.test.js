"use strict";

// SPDX-License-Identifier: GPL-3.0-only

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const backgroundScript = fs.readFileSync(
  new URL("../extension/background.js", `file://${__filename}`),
  "utf8",
);

async function main() {
  let messageListener = null;
  let installedListener = null;
  const registered = [];
  const injectedCss = [];
  const injectedScripts = [];
  const removedPermissions = [];

  const context = {
    URL,
    chrome: {
      runtime: {
        getURL: (path) => `chrome-extension://test/${path}`,
        onInstalled: {addListener: (listener) => { installedListener = listener; }},
        onMessage: {addListener: (listener) => { messageListener = listener; }},
      },
      storage: {local: {get: async () => ({privacyConsentVersion: 1})}},
      tabs: {create: async () => {}},
      scripting: {
        getRegisteredContentScripts: async ({ids}) =>
          registered.filter((script) => ids.includes(script.id)),
        registerContentScripts: async (scripts) => { registered.push(...scripts); },
        unregisterContentScripts: async ({ids}) => {
          for (let index = registered.length - 1; index >= 0; index -= 1) {
            if (ids.includes(registered[index].id)) registered.splice(index, 1);
          }
        },
        insertCSS: async (details) => { injectedCss.push(details); },
        executeScript: async (details) => { injectedScripts.push(details); },
      },
      permissions: {
        remove: async (details) => {
          removedPermissions.push(details);
          return true;
        },
      },
    },
    console,
  };

  vm.runInNewContext(backgroundScript, context);
  assert.equal(typeof messageListener, "function");
  assert.equal(typeof installedListener, "function");

  const send = (message) => new Promise((resolve) => {
    const keepChannelOpen = messageListener(message, {}, resolve);
    assert.equal(keepChannelOpen, true);
  });

  const enabled = await send({
    type: "PUREVIEW_ENABLE_SITE",
    origin: "https://test.invalid",
    tabId: 42,
  });
  assert.equal(enabled.ok, true);
  assert.equal(registered.length, 1);
  assert.deepEqual([...registered[0].matches], ["https://test.invalid/*"]);
  assert.equal(registered[0].persistAcrossSessions, true);
  assert.equal(registered[0].runAt, "document_start");
  assert.equal(injectedCss[0].target.tabId, 42);
  assert.equal(injectedScripts[0].target.tabId, 42);

  await send({type: "PUREVIEW_ENABLE_SITE", origin: "https://test.invalid", tabId: 42});
  assert.equal(registered.length, 1, "registration must not be duplicated");

  const invalid = await send({
    type: "PUREVIEW_ENABLE_SITE",
    origin: "https://test.invalid/path",
    tabId: 42,
  });
  assert.equal(invalid.ok, false);

  const disabled = await send({
    type: "PUREVIEW_DISABLE_SITE",
    origin: "https://test.invalid",
  });
  assert.equal(disabled.ok, true);
  assert.equal(registered.length, 0);
  assert.deepEqual([...removedPermissions[0].origins], ["https://test.invalid/*"]);

  console.log("PureView background tests: OK");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
