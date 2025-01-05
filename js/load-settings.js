"use strict";

importScripts("shared.js");

chrome.runtime.onInstalled.addListener(async () => {
  await loadSettingsFromStorage();
});
