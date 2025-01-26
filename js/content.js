"use strict";

async function main() {
  // loading settings from storage
  const settings = await loadSettingsFromStorage();

  const blocked = await handleDomainBlocking(settings);

  // if current domain is blocked, we don't need to do anything further
  if (blocked) {
    return;
  }

  if (!settings.antishortsMode) {
    return;
  }

  // if current domain is blocked, we don't need to do anything further
  if (clearBlockedPage()) {
    return;
  }

  // Aggressive Shorts blocking starts early
  if (window.location.hostname.includes('youtube.com')) {
    blockYouTubeShorts();
  }

  window.addEventListener("DOMContentLoaded", () => {
    // if this page's content was already replaced, we don't need to do anything
    if (replacePageContent.contentReplaced) {
      return;
    }

    antishortsHideButtons();
    
    // Additional Shorts blocking on page load
    if (window.location.hostname.includes('youtube.com')) {
      blockYouTubeShorts();
    }
  });
}

main().catch(console.error);

function replacePageContent() {
  if (replacePageContent.contentReplaced) {
    console.error("replacePageContent() was called twice");
    return true;
  }

  if (document.head) {
    document.head.remove();
  }

  let body = document.body;
  if (!body) {
    body = document.createElement("body");
    document.documentElement.appendChild(body);
  }

  body.innerHTML = `
      <p style="font-size: 24px;">Is this what you want to do with <strong>your limited time</strong> bbg?</p>
      <h1 style="font-size: 32px;">Don't do this to yourself. <u>Get bored instead.</u> Get creative.</h1>
`;
  body.style.background = "#ffffff";
  body.style.color = "#000000";
  body.style.textAlign = "center";

  // this is a flag to prevent this function from being run again
  // it shouldn't be called twice, but just in case
  replacePageContent.contentReplaced = true;

  // this script is ranAt document_start, but i observed that
  // after the content is replaced by this function, another body tag was added
  // to the document, so we need to remove it
  const observer = new MutationObserver(() => {
    document.querySelectorAll("body").forEach((b) => {
      if (b !== body) {
        b.remove();
      }
    });
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: false,
  });
}

/**
 *
 * @param {Settings} settings
 * @returns {Promise<boolean>} `true` if curent page is blocked else `false`.
 */
async function handleDomainBlocking(settings) {
  const currentDomain = window.location.hostname;
  if (settings.whitelistMode) {
    const whiltelist = new Set(settings.whitelistSites);

    // if current domain is in the whitelist, we don't need to do anything
    if (whiltelist.has(currentDomain)) {
      return false;
    }

    // we also have to check if the current current domain is a subdomain of a whitelisted domain
    for (const domain of whiltelist) {
      // if current domain is a subdomain of a whitelisted domain, we don't need to do anything
      if (currentDomain.endsWith(`.${domain}`)) {
        return false;
      }
    }

    // if we reach here, current domain is not in the whitelist, so we need to block it
    replacePageContent();
    return true;
  }

  const blacklist = new Set(settings.blacklistSites);

  // add TikTok to blacklist if antishortsMode is enabled
  if (settings.antishortsMode) {
    blacklist.add(TIKTOK_DOMAIN);
  }

  // if current domain is in the blacklist, we need to block it
  if (blacklist.has(currentDomain)) {
    replacePageContent();
    return true;
  }

  // we also have to check if the current current domain is a subdomain of a blocked domain
  for (const domain of blacklist) {
    // if current domain is a subdomain of a blocked domain, we need to block it
    if (currentDomain.endsWith(`.${domain}`)) {
      replacePageContent();
      return true;
    }
  }

  return false;
}

// TIKTOK_DOMAIN will be added to blacklisted sites if antishortsMode is enabled
const TIKTOK_DOMAIN = "tiktok.com";
const antishortsBlockedPaths = {
  "instagram.com": ["/reels", "/explore"],
  [TIKTOK_DOMAIN]: ["/"],
  // YouTube fuckers are clever. Shorts button is an actual buton, not a link.
  "youtube.com": ["/shorts"],
};

/**
 * Get paths from `antishortsBlockedPaths` for current domain.
 * If curent domain is already available in `antishortsBlockedPaths`, OR
 * any of the domain is subdomain of current domain, then return the paths for that domain.
 * @returns
 */
function getAntishortsBlockedPaths() {
  /** @type {string[] | undefined} */
  let paths;

  for (const domain in antishortsBlockedPaths) {
    if (isSubdomainOrItself(domain, window.location.hostname)) {
      paths = antishortsBlockedPaths[domain];
      break;
    }
  }

  return paths;
}

/**
 * Hides buttons for id current domain is (or is a subdomain of) a domain
 * not allowed in anti-shorts mode.
 */
function antishortsHideButtons() {
  const paths = getAntishortsBlockedPaths();
  if (!paths?.length) {
    return false;
  }

  const selectors = paths.map((selector) => `a[href^="${selector}"]`).join(", ");

  // add <style> to hide the links - a simple idea suggested by @sxmawl
  // and i feel that his solution is better than mine cuz i was using
  // MutationObserver to remove the buttons again when they come back
  const $style = document.createElement("style");
  $style.textContent = `
    ${selectors} {
      display: none !important;
    }
  `;
  document.head.appendChild($style);

  return true;
}

// So we will just clear the page
function clearBlockedPage() {
  const paths = getAntishortsBlockedPaths();
  if (!paths?.length) {
    return false;
  }

  for (const path of paths) {
    if (!window.location.pathname.startsWith(path)) {
      continue;
    }

    replacePageContent();
    return true;
  }

  return false;
}

/**
 * Specifically block YouTube Shorts with multiple blocking techniques
 */
function blockYouTubeShorts() {
  // Comprehensive list of selectors to target Shorts elements
  const shortsSelectors = [
    // Shorts links and navigation
    'a[href*="/shorts/"]',
    'a[title="Shorts"]',
    '[aria-label="Shorts"]',
    
    // Shelf renderers
    'ytd-reel-shelf-renderer',
    'ytd-shorts-shelf-renderer',
    '.ytd-shorts-shelf-renderer',
    
    // Sidebar and navigation elements
    '#sections > ytd-guide-section-renderer:has(a[href*="/shorts"])',
    'tp-yt-paper-tab:has(a[href*="/shorts"])',
    '.ytd-guide-entry-renderer:has([href*="/shorts"])',
    
    // Additional YouTube component selectors
    '[href*="/shorts"]'
  ];

  // Function to remove Shorts elements
  function removeShorts() {
    shortsSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Multiple removal techniques
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.setAttribute('hidden', 'true');
        
        // Attempt to remove from DOM
        try {
          el.remove();
        } catch (error) {
          console.log('Could not remove Shorts element:', selector);
        }
      });
    });
  }

  // Add style to completely hide Shorts-related content
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    a[href*="/shorts/"],
    ytd-reel-shelf-renderer,
    ytd-shorts-shelf-renderer,
    .ytd-shorts-shelf-renderer,
    [href*="/shorts"] {
      display: none !important;
      visibility: hidden !important;
      width: 0 !important;
      height: 0 !important;
      opacity: 0 !important;
    }
  `;
  
  // Append style to head
  if (document.head) {
    styleEl.setAttribute('data-shorts-block', 'true');
    document.head.appendChild(styleEl);
  }

  // Intercept and block Shorts navigation
  const shortsBlocker = (event) => {
    const target = event.target.closest('a');
    if (!target) return;

    const href = target.getAttribute('href');
    if (href && href.includes('/shorts/')) {
      event.preventDefault();
      event.stopPropagation();
      
      // Replace page content or do additional blocking
      replacePageContent();
    }
  };

  // Continuous removal with MutationObserver
  const shortsRemovalObserver = new MutationObserver(() => {
    removeShorts();
  });

  // Initial removal
  removeShorts();

  // Add click event listener to prevent Shorts navigation
  document.addEventListener('click', shortsBlocker, true);

  // Start observing the entire document
  shortsRemovalObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Modify antishortsBlockedPaths to include /shorts explicitly
  antishortsBlockedPaths["youtube.com"].push("/shorts");
}

// ----- utils/helpers -----
function isSubdomainOrItself(sub, domain) {
  return domain === sub || domain.endsWith(`.${sub}`);
}