/* The subtitles of Noovo are also cable TV styled. A few words get rolled in and out each time. 
*/

import {squashCuesNoovo, createWrapper, getWrapper, createTranslateElements, addRule, parseVttCues, 
    addEnglishToOriginalCues, toggleTextTracksNoovoAndToutv, getSavedMode, changeSubtitleFontSize, 
    styleVideoCues, adjustSubtitlePosition} from "./utils";
import {moveSubtitlesUpBy} from "./config";

var cueDict = {};  // it's a global variable because there doesnt seem to be ways to pass extra params into the mutation observer.
var processedCueIds = [];
var wrapper = createWrapper(document);
var modified = false;

var mode;
var fetchedUrls = new Set();
var subtitleMovedUp = null;

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
            // resize font based on screen size
            var resizeObserver = new ResizeObserver(changeSubtitleFontSize);
            resizeObserver.observe(document.getElementsByClassName("jw-media jw-reset")[0]);

            subtitlePositionObserver = new MutationObserver(adjustSubtitlePositionWrapper);
            subtitlePositionObserver.observe(document.getElementById("vidi_player_instance_1"), 
                                              {attributes: true, attributeFilter: ["class"]});
        }
    }
}
videoReadyObserver = new MutationObserver(prepareContainer);
videoReadyObserver.observe(document.documentElement, {childList:true, subtree:true});

translationObserver = new MutationObserver(addEnglishToOriginalCuesWrapper);
translationObserver.observe(wrapper, {characterData: true, subtree: true});

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
        let cues = await parseVttCues(vtt);
        cues = squashCuesNoovo(cues);
        for (const cue of cues) {
            if (processedCueIds.includes(cue.id)) continue;
            if (!cueDict.hasOwnProperty(cue.id)) {
                cue.align = "center";
                cue.position = "auto";
                if (subtitleMovedUp) {
                    cue.line = moveSubtitlesUpBy["noovo"];
                } else {
                    cue.line = "auto";
                }
                cue.snapToLines = false;
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

function adjustSubtitlePositionWrapper(mutations, observer) {
    const mutation = mutations[mutations.length - 1];
    if (!mutation.target.className.includes("jw-flag-user-inactive")) {
        subtitleMovedUp = true;
        adjustSubtitlePosition(moveSubtitlesUpBy["noovo"]);

    } else if (mutation.target.className.includes("jw-flag-user-inactive")) {
        if (document.getElementsByTagName("VIDEO")[0].paused) return;
        subtitleMovedUp = false;
        adjustSubtitlePosition("auto");
    }
}