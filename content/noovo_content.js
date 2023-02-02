/* The subtitles of Noovo are also cable TV styled. A few words get rolled in and out each time. 
*/

import {squashCuesNoovo, createWrapper, getWrapper, createTranslateElements, addRule, parseVttCues, addEnglishToOriginalCues} from "./utils";

var cueDict = {};  // it's a global variable because there doesnt seem to be ways to pass extra params into the mutation observer.
var processedCueIds = [];
var wrapper = createWrapper(document);
var modified = false;

var prepareContainer = function(mutations, observer){
    for (const mutation of mutations){
        if (mutation.target.className && 
            typeof mutation.target.className === "string" && 
            mutation.target.className.includes("jw-captions")) {
            if (!modified) {
                modifyVideoPlayer();
                modified = true;
            }
            text_track_container = document.getElementsByClassName("jw-text-track-container jw-reset")[0];
            if (text_track_container) {
                text_track_container.style.display = 'none';
            } 
            // this.disconnect();
        }
    }
}
window.initial_observer = new MutationObserver(prepareContainer);
window.initial_observer.observe(document.documentElement, {childList:true, subtree:true});

window.observer = new MutationObserver(addEnglishToOriginalCuesWrapper);
window.observer.observe(wrapper, {characterData: true, subtree: true});

chrome.runtime.onMessage.addListener(async function (response, sendResponse) {
    const vtt = response["original_vtt"];
    let cues = await parseVttCues(vtt);
    cues = squashCuesNoovo(cues);
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

    createTranslateElements(cues, wrapper);
    if (!getWrapper(document)) {
        const video = document.getElementById("vidi_player_instance_1");
        video.appendChild(wrapper);
    }
    return true;
});


function addEnglishToOriginalCuesWrapper(mutations, observer) {
    const video = document.getElementsByClassName("jw-video jw-reset")[0];
    [cueDict, processedCueIds] = addEnglishToOriginalCues("noovo", cueDict, processedCueIds, video);
}

addRule("video::cue", {
    /* this background setting works for PCs, but not apple products. 
    For apple products, this setting is actually in settings->accessibility->captions
    */
    background: "transparent", 
    color: "white",
    "font-size": "18px",
});

function modifyVideoPlayer() {
    // make the video right-clickable
    var elements = document.getElementsByTagName("*");
    for(var id = 0; id < elements.length; ++id) { 
        elements[id].addEventListener('contextmenu', function(e) {e.stopPropagation()},true);
        elements[id].oncontextmenu = null; }
    document.getElementsByClassName("VidiPlayerstyles__VideoAdContainer-sc-qzp347-20 gcTUvL")[0].classList.add("notranslate");
}