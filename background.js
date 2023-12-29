chrome.webRequest.onCompleted.addListener(
  function(details) {
    if ((details.initiator === "https://video.telequebec.tv" && details.url.includes("segment") && details.url.includes("vtt")) ||
      (details.initiator === "https://www.noovo.ca" && details.url.includes("manifest.vtt")) ||
      (details.initiator === "https://ici.tou.tv" && details.url.includes("vtt"))) {
      if (!details.initiator.includes("chrome-extension")) {
        fetch(details.url, {headers: {"from_traditou": "true"}}).then(res => res.text()).then( res =>
          { 
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
              chrome.tabs.sendMessage(tabs[0].id, {
                "type": "subtitles", 
                "original_vtt": res,
                "url": details.url});
              });
            console.log(res)
            console.log("test test traditou")
          })
      }
    }
    if (details.initiator === "https://www.primevideo.com" && details.url.includes("ttml2")) {
      // if (details.url === 'https://cf-timedtext.aux.pv-cdn.net/a6e6/04f0/9934/42cf-9444-c2756b5da1ed/5b1cd644-0e73-43e7-9027-06e24420413e.ttml2') {
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
            console.log("test test traditou")
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
      "https://*.primevideo.com/*"
    ] // and remember to add to manifest.json host permissions
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
