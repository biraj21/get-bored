"use strict";

/** @type {HTMLElement | null} */
let $statusText = null;

document.addEventListener("DOMContentLoaded", async () => {
  const $antishortsModeCheckbox = document.getElementById("antishorts-mode");
  const $blacklistContainer = document.getElementById("blacklist-container");
  const $blacklistSitesTextarea = document.getElementById("blacklist-sites");
  const $whitelistContainer = document.getElementById("whitelist-container");
  const $whitelistSitesTextarea = document.getElementById("whitelist-sites");
  const $whitelistModeCheckbox = document.getElementById("whitelist-mode");
  $statusText = document.getElementById("status");

  const settings = await loadSettingsFromStorage();

  $antishortsModeCheckbox.checked = settings.antishortsMode;
  $blacklistSitesTextarea.value = settings.blacklistSites.join("\n");
  $whitelistSitesTextarea.value = settings.whitelistSites.join("\n");
  $whitelistModeCheckbox.checked = settings.whitelistMode;

  let antishortsModeEnabledAt = settings.antishortsModeEnabledAt;

  toggleTextareas();

  // validate antishorts mode toggle
  $antishortsModeCheckbox.addEventListener("change", () => {
    if ($antishortsModeCheckbox.checked) {
      return;
    }

    if (!antishortsModeEnabledAt) {
      return;
    }

    const diff = Date.now() - antishortsModeEnabledAt;
    const TWELVE_HOURS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

    // do not allow antishorts mode to be disabled if
    // it was enabled less than 12 hours ago
    if (antishortsModeEnabledAt && diff < TWELVE_HOURS) {
      $antishortsModeCheckbox.checked = true;
      const canDisableTime = new Date(antishortsModeEnabledAt + TWELVE_HOURS);
      setStatusText(
        `Antishorts mode was enabled less than 12 hours ago. Wait till ${canDisableTime.toLocaleTimeString()} to disabled it.`,
        15_000,
        "error",
      );
      return;
    }
  });

  // toggle between blacklist and whitelist textareas
  $whitelistModeCheckbox.addEventListener("change", toggleTextareas);

  // save settings
  document
    .getElementById("save-settings")
    .addEventListener("click", async () => {
      const newAntishortsMode = $antishortsModeCheckbox.checked;
      const blacklistSites = getSitesFromTextarea($blacklistSitesTextarea);
      const whitelistSites = getSitesFromTextarea($whitelistSitesTextarea);
      const whitelistMode = $whitelistModeCheckbox.checked;

      // if antishorts mode was just enabled, set the current time
      if (!settings.antishortsMode && newAntishortsMode) {
        antishortsModeEnabledAt = Date.now();
      } else if (!newAntishortsMode) {
        antishortsModeEnabledAt = null;
      }

      await chrome.storage.sync.set({
        antishortsMode: newAntishortsMode,
        antishortsModeEnabledAt,
        blacklistSites,
        whitelistSites,
        whitelistMode,
      });
      setStatusText("Settings saved!", 2000, "success");
    });

  // to toggle between blacklist and whitelist textareas
  function toggleTextareas() {
    if ($whitelistModeCheckbox.checked) {
      $blacklistContainer.classList.add("hidden");
      $whitelistContainer.classList.remove("hidden");
    } else {
      $whitelistContainer.classList.add("hidden");
      $blacklistContainer.classList.remove("hidden");
    }
  }
});

// ----- utils/helpers -----
function getSitesFromTextarea(textarea) {
  return textarea.value
    .split("\n")
    .map((site) => site.trim())
    .filter(Boolean);
}

/**
 * Set the status text
 *
 * @param {string} text
 * @param {number | undefined} timeout
 * @param {"success" | "error" | undefined} type
 * @returns
 */
function setStatusText(text, timeout, type) {
  if (!$statusText) {
    throw new Error(`setStatusText() error: $statusText is '${$statusText}'`);
  }

  $statusText.classList.remove("success", "error");

  text = text.trim();
  $statusText.textContent = text;

  if (type) {
    $statusText.classList.add(type);
  }

  // assume that it was meant to clear the status text
  if (!text) {
    return;
  }

  if (timeout) {
    setTimeout(() => {
      $statusText.classList.remove("success", "error");
      $statusText.textContent = "";
    }, timeout);
  }
}
