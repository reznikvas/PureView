"use strict";

// SPDX-License-Identifier: GPL-3.0-only

const CONSENT_KEY = "privacyConsentVersion";
const CONSENT_DATE_KEY = "privacyConsentDate";
const REQUIRED_CONSENT_VERSION = 1;
const agreement = document.getElementById("agreement");
const acceptButton = document.getElementById("accept");
const result = document.getElementById("result");

agreement.addEventListener("change", () => {
  acceptButton.disabled = !agreement.checked;
});

acceptButton.addEventListener("click", async () => {
  if (!agreement.checked) return;

  await chrome.storage.local.set({
    [CONSENT_KEY]: REQUIRED_CONSENT_VERSION,
    [CONSENT_DATE_KEY]: new Date().toISOString(),
  });
  agreement.disabled = true;
  acceptButton.disabled = true;
  acceptButton.textContent = "PureView is enabled";
  result.textContent = "Open a website and select the PureView toolbar icon to begin.";
});
