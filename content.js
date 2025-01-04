/** @type {MutationObserver | null} */
let domObserver = null;

async function main() {
  // loading settings from storage
  const data = await chrome.storage.sync.get([
    "antishortsMode",
    "whitelistMode",
  ]);

  const blocked = await handleDomainBlocking(data.whitelistMode);
  if (blocked) {
    return;
  }

  if (!data.antishortsMode) {
    return;
  }

  function antishorts() {
    const blocked = clearBlockedPage();

    // if current page is blocked, we don't need to do anything further
    // since we already replaced the page content
    if (blocked) {
      return;
    }

    antishortsHideButtons();
  }

  // observe DOM changes to ensure it also works when user interacts with the page
  domObserver = new MutationObserver(antishorts);
  domObserver.observe(document.body, { childList: true, subtree: true });
  antishorts();
}

main().catch(console.error);

function replacePageContent() {
  // wrapped in setTimeout to let the original content load
  // i noticed that withtout timeout, there was a perpetual loading indicator
  // in tab's title bar or address bar whatever it's called
  setTimeout(() => {
    // we have to  disconnect the observer
    // othwersise it will infinitely call getBored() since clearBlockedPage()
    // modifies the DOM
    if (domObserver) {
      domObserver.disconnect();
    }

    document.head.remove();
    document.body.innerHTML = `
      <p style="font-size: 24px;">Is this what you want to do with <strong>your limited time</strong> bbg?</p>
      <h1>Don't do this to yourself. <u>Get bored instead.</u> Get creative.</h1>
`;
    document.body.style.background = "#ffffff";
    document.body.style.color = "#000000";
    document.body.style.textAlign = "center";
  }, 1000);
}

/**
 *
 * @param {boolean} whitelistMode
 * @param {boolean} antishortsMode
 * @returns {Promise<boolean>} `true` if curent page is blocked else `false`.
 */
async function handleDomainBlocking(whitelistMode, antishortsMode) {
  const currentDomain = window.location.hostname;
  if (whitelistMode) {
    const data = await chrome.storage.sync.get("whitelistSites");
    const whilteList = new Set(data.whitelistSites || []);

    // if current domain is in the whitelist, we don't need to do anything
    if (whilteList.has(currentDomain)) {
      return false;
    }

    // we also have to check if the current current domain is a subdomain of a whitelisted domain
    for (const domain of whilteList) {
      // if current domain is a subdomain of a whitelisted domain, we don't need to do anything
      if (currentDomain.endsWith(`.${domain}`)) {
        return false;
      }
    }

    // if we reach here, current domain is not in the whitelist, so we need to block it
    replacePageContent();
    return true;
  }

  const data = await chrome.storage.sync.get("blacklistSites");
  const blacklist = new Set(data.blacklistSites || []);

  // add TikTok to blacklist if antishortsMode is enabled
  if (antishortsMode) {
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

  const selectors = paths
    .map((selector) => `a[href^="${selector}"]`)
    .join(", ");
  const links = document.querySelectorAll(selectors);
  links.forEach((link) => {
    link.style.display = "none";
  });

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

// ----- utils/helpers -----
function isSubdomainOrItself(sub, domain) {
  return domain === sub || domain.endsWith(`.${sub}`);
}
