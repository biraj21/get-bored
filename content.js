const INSTAGRAM_BS = ["/reels", "/explore"];
const YOUTUBE_BS = ["/shorts"];

const blockedPaths = {
  "www.instagram.com": INSTAGRAM_BS,
  "www.youtube.com": YOUTUBE_BS,
};

function hideReelsAndShorts() {
  const domain = window.location.hostname;
  const paths = blockedPaths[domain];
  if (!paths?.length) {
    return;
  }

  const selectors = paths
    .map((selector) => `a[href^="${selector}"]`)
    .join(", ");
  const links = document.querySelectorAll(selectors);
  links.forEach((link) => {
    link.style.display = "none";
  });
}

// YouTube fuckers are clever. Shorts button is an actual buton, not a link.
// So we will just clear the page
function clearBlockedPage() {
  const domain = window.location.hostname;
  const paths = blockedPaths[domain];
  if (!paths?.length) {
    return false;
  }

  for (const path of paths) {
    if (!window.location.pathname.startsWith(path)) {
      continue;
    }

    setTimeout(() => {
      document.head.remove();
      document.body.innerHTML = `
        <p style="font-size: 24px;">Is this what you want to do with <strong>your limited time</strong> bbg?</p>
        <h1>Don't do this to yourself. <u>Get bored instead.</u> Get creative.</h1>
`;
      document.body.style.background = "#ffffff";
      document.body.style.color = "#000000";
      document.body.style.textAlign = "center";
    }, 1000);

    return true;
  }

  return false;
}

function getBored() {
  hideReelsAndShorts();
  const blocked = clearBlockedPage();

  // if we've already blocked the page, the we will disconnect the observer
  // othwersise it will infinitely call getBored() since clearBlockedPage()
  // modifies the DOM
  if (blocked) {
    observer.disconnect();
  }
}

// observe DOM changes to ensure it also works when user interacts with the page
const observer = new MutationObserver(getBored);
observer.observe(document.body, { childList: true, subtree: true });

getBored();
