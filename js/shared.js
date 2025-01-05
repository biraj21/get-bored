"use strict";

const DEFAULT_BLACKLIST_SITES = [
  "instagram.com",
  "tiktok.com",
  "facebook.com",
  "x.com",
  "twitter.com",
];

const DEFAULT_WHITELIST_SITES = [
  "google.com",
  "chatgpt.com",
  "claude.ai",
  "perplexity.ai",
  "github.com",
  "stackoverflow.com",
];

/**
 * @typedef {Object} Settings
 * @property {boolean} antishortsMode - Whether antishorts mode is enabled.
 * @property {number | null | undefined} antishortsModeEnabledAt - The timestamp when antishorts mode was enabled, or undefined.
 * @property {string[]} blacklistSites - Set of blacklisted sites.
 * @property {string[]} whitelistSites - Set of whitelisted sites.
 * @property {boolean} whitelistMode - Whether whitelist mode is enabled.
 */

/**
 * Loads settings from storage. It also sets some defaults in the storage
 * so call this function once on installation.
 *
 * @returns {Promise<Settings>} readonly settings object.
 */
async function loadSettingsFromStorage() {
  const data = await chrome.storage.sync.get([
    "antishortsMode",
    "antishortsModeEnabledAt",
    "blacklistSites",
    "whitelistSites",
    "whitelistMode",
  ]);

  const antishortsMode =
    typeof data.antishortsMode === "boolean" ? data.antishortsMode : true;

  /** @type {Settings["antishortsModeEnabledAt"]} */
  let antishortsModeEnabledAt = data.antishortsModeEnabledAt;
  if (antishortsMode && typeof antishortsModeEnabledAt !== "number") {
    antishortsModeEnabledAt = Date.now();
    await chrome.storage.sync.set({ antishortsMode, antishortsModeEnabledAt });
  }

  const whitelistMode =
    typeof data.whitelistMode === "boolean" ? data.whitelistMode : false;

  /** @type {Settings} */
  const withDefaults = Object.freeze({
    antishortsMode,
    antishortsModeEnabledAt,
    blacklistSites: data.blacklistSites || DEFAULT_BLACKLIST_SITES,
    whitelistSites: data.whitelistSites || DEFAULT_WHITELIST_SITES,
    whitelistMode,
  });

  return withDefaults;
}
