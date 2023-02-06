// telequebec uses brightcove to manage their videos, so first I need to find the vtt files from the networks requests/responses.
// Then translate them and stick them back into the video.


import {squashCues, createWrapper, getWrapper, createTranslateElements, addRule, 
    parseVttCues, addEnglishToOriginalCues, toggleTextTracksTelequebec, getSavedMode, changeSubtitleFontSize, styleVideoCues} from "./utils";

// const utils = require("./utils");
// cueDict is a dictionary of cues to be processed (just downloaded).
var cueDict = {};  // it's a global variable because there doesnt seem to be ways to pass extra params into the mutation observer.
var processedCueIds = [];
var mode;
var cueIdCount = 0;

var prepareContainer = function(mutations, observer){
    for (const mutation of mutations){
        if (mutation.target.tagName === "VIDEO") {
            let track =  document.getElementById("français");
            if (track && mode !== 'off') {
                track.track.mode = "hidden";
            }
            let timeDisplay =  document.getElementsByClassName("vjs-current-time vjs-time-control vjs-control")[0];
            if (timeDisplay) {
                timeDisplay.translate = "no";
                timeDisplay.setAttribute("translate", "no");
            }
            var resizeObserver = new ResizeObserver(changeSubtitleFontSize);
            resizeObserver.observe(document.getElementsByTagName("VIDEO")[0]);
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
    if (response["type"] === "mode") {
        mode = response["mode"];
        toggleTextTracksTelequebec(mode, document.getElementById("player_html5_api"));
    } else if (response["type"] === "subtitles") {
        const vtt = response["original_vtt"]; 
        let frenchCues = await parseVttCues(vtt);
        [frenchCues, cueIdCount] = squashCues(frenchCues, cueIdCount);
        for (const cue of frenchCues) {
            if (processedCueIds.includes(cue.id)) continue;
            if (!cueDict.hasOwnProperty(cue.id)) {
                cue.isElementCreated = false;
                cue.align = "center";
                cue.position = "auto";
                cue.line = "auto";
                cueDict[cue.id] = cue;
            }
        }
        createTranslateElements(frenchCues, getWrapper(document));
    }
    return true;
});


async function addEnglishToOriginalCuesWrapper(mutations, observer) {
    const video = document.getElementById("player_html5_api");
    [cueDict, processedCueIds] = addEnglishToOriginalCues("telequebec", cueDict, processedCueIds, video);
    mode = await getSavedMode();
    toggleTextTracksTelequebec(mode, video);
}

styleVideoCues();