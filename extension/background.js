
const NOVA_SERVER = "http://127.0.0.1:8787";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true
  });
});

// Check whether the current website is accessible
async function hasWebsitePermission(url) {
  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    return await chrome.permissions.contains({
      origins: [`${parsed.origin}/*`]
    });
  } catch {
    return false;
  }
}

// Request permission for a website
async function requestWebsitePermission(url) {
  try {
    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    return await chrome.permissions.request({
      origins: [`${parsed.origin}/*`]
    });
  } catch {
    return false;
  }
}

// Inject the inspection script
async function inspectWebsite(tabId, url) {
  const permitted = await hasWebsitePermission(url);

  if (!permitted) {
    throw new Error("Website permission has not been granted.");
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });

  return { success: true };
}

// Messages from NOVA's side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "NOVA_GET_TAB") {
    chrome.tabs.query({
      active: true,
      lastFocusedWindow: true
    }).then(([tab]) => {
      sendResponse({
        tabId: tab?.id,
        url: tab?.url,
        title: tab?.title
      });
    }).catch(error => {
      sendResponse({ error: error.message });
    });

    return true;
  }

  if (message.type === "NOVA_REQUEST_PERMISSION") {
    requestWebsitePermission(message.url)
      .then(granted => sendResponse({ granted }))
      .catch(error => sendResponse({
        granted: false,
        error: error.message
      }));

    return true;
  }

  if (message.type === "NOVA_INSPECT") {
    inspectWebsite(message.tabId, message.url)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({
        success: false,
        error: error.message
      }));

    return true;
  }
});
