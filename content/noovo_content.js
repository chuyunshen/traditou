/* The subtitles of Noovo are also cable TV styled. A few words get rolled in and out each time. 
*/

import {squashCuesNoovo, createWrapper, getWrapper, createTranslateElements, addRule, parseVttCues, 
    addEnglishToOriginalCues, toggleTextTracksNoovoAndToutv, getSavedMode, changeSubtitleFontSize, styleVideoCues} from "./utils";

var cueDict = {};  // it's a global variable because there doesnt seem to be ways to pass extra params into the mutation observer.
var processedCueIds = [];
var wrapper = createWrapper(document);
var modified = false;

var mode;
var fetchedUrls = new Set();

var prepareContainer = function(mutations, observer){
    for (const mutation of mutations){
        if (mutation.target.className && 
            typeof mutation.target.className === "string" && 
            mutation.target.className.includes("jw-captions")) {
            if (!modified) {
                modifyVideoPlayer();
                modified = true;
            }
            if (mode !== "off") {
                originalSubtitles = document.getElementsByClassName("jw-text-track-container jw-reset")[0];
                if (originalSubtitles) {
                    originalSubtitles.style.display = 'none';
                } 
            }
            var resizeObserver = new ResizeObserver(changeSubtitleFontSize);
            resizeObserver.observe(document.getElementsByClassName("jw-media jw-reset")[0]);
        }
    }
}
window.initial_observer = new MutationObserver(prepareContainer);
window.initial_observer.observe(document.documentElement, {childList:true, subtree:true});

window.observer = new MutationObserver(addEnglishToOriginalCuesWrapper);
window.observer.observe(wrapper, {characterData: true, subtree: true});

chrome.runtime.onMessage.addListener(async function (response, sendResponse) {
    if (response["type"] === "mode") {
        mode = response["mode"];
        originalSubtitles = document.getElementsByClassName("jw-text-track-container jw-reset")[0];
        toggleTextTracksNoovoAndToutv(mode, document.getElementsByTagName("VIDEO")[0], originalSubtitles);
    } else if (response["type"] === "subtitles") {
        // Noovo tends to send two duplicates at the beginning of the video.
        const url = response["url"];
        if (fetchedUrls.has(url)) {
            return true;
        }
        fetchedUrls.add(url);
        const vtt = response["original_vtt"];
        vttReceived = true;
        console.log(vtt);
        let cues = await parseVttCues(vtt);
        cues = squashCuesNoovo(cues);
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
            const videoWrapper = document.getElementById("vidi_player_instance_1");
            videoWrapper.appendChild(wrapper);
        }
    }
    return true;
});


async function addEnglishToOriginalCuesWrapper(mutations, observer) {
    const video = document.getElementsByClassName("jw-video jw-reset")[0];
    [cueDict, processedCueIds] = addEnglishToOriginalCues("noovo", cueDict, processedCueIds, video);
    originalSubtitles = document.getElementsByClassName("jw-text-track-container jw-reset")[0];
    mode = await getSavedMode();
    toggleTextTracksNoovoAndToutv(mode, document.getElementsByTagName("VIDEO")[0], originalSubtitles);
}

function modifyVideoPlayer() {
    // make the video right-clickable
    var elements = document.getElementsByTagName("*");
    for(var id = 0; id < elements.length; ++id) { 
        elements[id].addEventListener('contextmenu', function(e) {e.stopPropagation()},true);
        elements[id].oncontextmenu = null; }
}

styleVideoCues();