const VTT_RULE_ID = 2001;
const TTML_RULE_ID = 2002;

const processedSubtitleUrls = new Set();

async function setupSubtitleRules() {
  const rules = [
    {
      id: VTT_RULE_ID,
      priority: 1,
      action: { type: "allow" },
      condition: {
        urlFilter: "*.vtt*",
        resourceTypes: ["xmlhttprequest", "media", "other"]
      }
    },
    {
      id: TTML_RULE_ID,
      priority: 1,
      action: { type: "allow" },
      condition: {
        urlFilter: "*ttml2*",
        resourceTypes: ["xmlhttprequest", "media", "other"]
      }
    }
  ];

  const activeRules = await chrome.declarativeNetRequest.getDynamicRules();
  const activeIds = activeRules.map(rule => rule.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: activeIds,
    addRules: rules
  });
  
  console.log("Traditou Subtitle URL Interceptors Active.");
}

// Intercept the URL and send it down to the page context
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((details) => {
  const url = details.request.url;
  const tabId = details.request.tabId;

  if (tabId <= 0) return;

  /**
   * this is to prevent the infinite loop where the background script 
   * intercepts the subtitle URL request, sends it to the content script, 
   * which then creates a new request to fetch the subtitle, which is again 
   * intercepted by the background script, and so on. 
   * By keeping track of processed subtitle URLs, we can avoid this loop.
   */ 
  if (processedSubtitleUrls.has(url)) {
    return;
  }

  processedSubtitleUrls.add(url);

  const isTtml = url.includes("ttml2");

  chrome.tabs.sendMessage(tabId, {
    type: "FETCH_SUBTITLE_FROM_PAGE",
    url: url,
    format: isTtml ? "ttml" : "vtt"
  }, () => {
    if (chrome.runtime.lastError) {
      // Suppress logging when tabs are updating/dead
    }
  });
});

// Initialization
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason == "install"){
    chrome.tabs.create({ url: chrome.runtime.getURL("info.html")});
  }
  if (details.reason == "update"){
    chrome.tabs.create({ url: chrome.runtime.getURL("update.html") });
    }
  await setupSubtitleRules();
});

chrome.runtime.onStartup.addListener(async () => {
  await setupSubtitleRules();
});
