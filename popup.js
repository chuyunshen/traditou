
async function syncMode() {
    for (const id of ["dual-mode", "french-mode", "english-mode", "off"]) {
        const savedMode = (await chrome.storage.local.get(["mode"]))["mode"];
        if (savedMode) {
            document.getElementById(savedMode).checked = true;
            for (const otherId of ["dual-mode", "french-mode", "english-mode", "off"].filter(item => item !== savedMode)) {
                document.getElementById(otherId).checked = false;
            }
        }

        document.getElementById(id).addEventListener("click", 
            () => {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
                chrome.tabs.sendMessage(tabs[0].id, {
                "type": "mode", "mode": id});
                });
                
            chrome.storage.local.set({ "mode": id});
            }
        )
    }
}
syncMode();

document.getElementById("learn-more-url").href = chrome.runtime.getURL("info.html");
document.getElementById("title-url").href = chrome.runtime.getURL("info.html");