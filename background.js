chrome.webRequest.onCompleted.addListener(
  function(details) {
    if ((details.initiator === "https://video.telequebec.tv" && details.url.includes("segment") && details.url.includes("vtt")) ||
      (details.initiator === "https://www.noovo.ca" && details.url.includes("manifest.vtt")) ||
      (details.initiator === "https://www.tv5unis.ca" && details.url.includes(".vtt")) ||
      (details.initiator === "https://ici.tou.tv" && details.url.includes("vtt"))) {
      if (!details.initiator.includes("chrome-extension")) {
        url = details.url
        if (details.initiator === "https://www.tv5unis.ca") {
          url = details.url.substring(0, details.url.indexOf(".vtt") + 4)
        }
        fetch(url, {headers: {"from_traditou": "true"}}).then(res => res.text()).then( res =>
          { 
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
              chrome.tabs.sendMessage(tabs[0].id, {
                "type": "subtitles", 
                "original_vtt": res,
                "url": url});
              });
            console.log(res)
          })
      }
    }
    if (details.initiator === "https://www.primevideo.com" && details.url.includes("ttml2")) {
      if (!details.initiator.includes("chrome-extension")) {
        fetch(details.url, {headers: {"from_traditou": "true"}}).then(res => res.text()).then( res =>
          { 
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
              chrome.tabs.sendMessage(tabs[0].id, {
                "type": "subtitles",
                "original_ttml": res,
                "url": details.url});
              });
            console.log(res)
          })
      }
    }
  },
  {
    // urls: ["<all_urls>"]
    urls: [
      "https://video.telequebec.tv/*",
      "https://*.brightcovecdn.com/*",
      "https://www.noovo.ca/*",
      "https://*.9c9media.com/*",
      "https://*.tou.tv/*",
      "https://*.akamaized.net/*",
      "https://*.pv-cdn.net/*",
      "https://*.primevideo.com/*",
      "https://*.tv5unis.ca/*",
      "https://*.llnw.net/*"
    ] // IMPORTANT: remember to add to manifest.json host permissions
  }) 
     
//STORAGE VALUES
//First Run, store default settings
chrome.runtime.onInstalled.addListener(function(details){
  if(details.reason == "install"){
    chrome.tabs.create({ url: chrome.runtime.getURL("info.html")});
  }
  if(details.reason == "update"){
    chrome.tabs.create({ url: chrome.runtime.getURL("update.html") });
    }
});
