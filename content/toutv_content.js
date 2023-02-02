
import {createWrapper, getWrapper, createTranslateElements, addRule, parseVttCues, addEnglishToOriginalCues} from "./utils";

var cueDict = {};  // it's a global variable because there doesnt seem to be ways to pass extra params into the mutation observer.
var processedCueIds = [];
var wrapper = createWrapper(document);
var modified = false;

var prepareContainer = function(mutations, observer){
    for (const mutation of mutations){
        if (mutation.target.className && 
            typeof mutation.target.className === "string" && 
            mutation.target.className.includes("vjs-text-track-display")) {
            if (!modified) {
                modifyVideoPlayer();
                modified = true;
            }
            document.getElementsByClassName("vjs-text-track-display")[0].style.display = "none";
        }
    }
}
window.initial_observer = new MutationObserver(prepareContainer);
window.initial_observer.observe(document.documentElement, {childList:true, subtree:true});

window.observer = new MutationObserver(addEnglishToOriginalCuesWrapper);
window.observer.observe(wrapper, {characterData: true, subtree: true});

function numberCues(cues) {
    let cueIdCount = 0
    for (const cue of cues) {
        cue.id = cueIdCount;
        cueIdCount++;
        cue.text = cue.parsedLine;
    }
    return cues;
}

chrome.runtime.onMessage.addListener(async function (response, sendResponse) {
    const vtt = response["original_vtt"];
    let cues = await parseVttCues(vtt);
    cues = numberCues(cues);
    console.log(cues);
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
        const appendable = document.getElementById("player");
        appendable.appendChild(wrapper);
    }
    return true;
});


function addEnglishToOriginalCuesWrapper(mutations, observer) {
    const video = document.getElementsByTagName("VIDEO")[0];
    [cueDict, processedCueIds] = addEnglishToOriginalCues("toutv", cueDict, processedCueIds, video);
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
    // document.getElementsByClassName("vjs-controls-disabled")[0].classList.add("notranslate");
}