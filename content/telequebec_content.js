// telequebec uses brightcove to manage their videos, so first I need to find the vtt files from the networks requests/responses.
// Then translate them and stick them back into the video.


import {squashCues, createWrapper, getWrapper, createTranslateElements, addRule, parseVttCues, addEnglishToOriginalCues} from "./utils";

// const utils = require("./utils");
// cueDict is a dictionary of cues to be processed (just downloaded).
var cueDict = {};  // it's a global variable because there doesnt seem to be ways to pass extra params into the mutation observer.
var processedCueIds = [];


var prepareContainer = function(mutations, observer){
    for (const mutation of mutations){
        if (mutation.target.tagName === "VIDEO") {
            let track =  document.getElementById("français");
            // if (track) {track.remove()} // cannot remove the original track, because if it's removed, the network no longer sends vtt files.
            if (track) {
                track.track.mode = "hidden";
            }
        }
    }
}
window.initial_observer = new MutationObserver(prepareContainer);
window.initial_observer.observe(document.documentElement, {characterData: true, childList:true, subtree:true});


let wrapper = createWrapper(document);
document.body.appendChild(wrapper);
window.observer = new MutationObserver(addEnglishToOriginalCuesWrapper);
window.observer.observe(wrapper, {characterData: true, subtree: true});

chrome.runtime.onMessage.addListener(async function (response, sendResponse) {
    const vtt = response["original_vtt"];
    let cues = await parseVttCues(vtt);
    cues = squashCues(cues);
    for (const cue of cues) {
        if (processedCueIds.includes(cue.id)) continue;
        if (!cueDict.hasOwnProperty(cue.id)) {
            cue.isElementCreated = false;
            cue.align = "center";
            cue.position = "auto";
            cue.line = "auto";
            cueDict[cue.id] = cue;
        }
    }
    createTranslateElements(cues, getWrapper(document));
    return true;
});


function addEnglishToOriginalCuesWrapper(mutations, observer) {
    [cueDict, processedCueIds] = addEnglishToOriginalCues("telequebec", cueDict, processedCueIds, document.getElementById("player_html5_api"));
}

addRule("video::cue", {
    /* this background setting works for PCs, but not apple products. 
    For apple products, this setting is actually in settings->accessibility->captions
    */
    background: "transparent", 
    color: "white",
    "font-size": "18px",
});
