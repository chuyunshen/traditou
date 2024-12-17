
import {createWrapper, getWrapper, createTranslateElements, addRule, parseVttCues, addEnglishToOriginalCues,
    getSavedMode, toggleTextTracks, styleVideoCues, adjustSubtitlePosition, changeSubtitleFontSize, refreshCues, refreshTextTracks} from "./utils";
import {moveSubtitlesUpBy} from "./config";

var cueDict = {};  // it's a global variable because there doesnt seem to be ways to pass extra params into the mutation observer.
var processedCueIds = [];
var mode;
var needToRefreshTextTracks = false;

var wrapper = createWrapper(document);
var modified = false;
var fetchedUrls = new Set();
var subtitleMovedUp = null;
var serviceName = "toutv";
var subtitleActiveClassName = "vjs-user-active"
var subtitleInactiveClassName = "vjs-user-inactive"

var prepareContainer = function(mutations, observer){
    for (const mutation of mutations){
        if (mutation.target.className && 
            typeof mutation.target.className === "string" && 
            mutation.target.className.includes("vjs-text-track-display")) {
            if (!modified) {
                modifyVideoPlayer();
                modified = true;
            }
            var resizeObserver = new ResizeObserver(changeSubtitleFontSize);
            resizeObserver.observe(document.getElementsByTagName("VIDEO")[0]);


            subtitlePositionObserver = new MutationObserver(adjustSubtitlePositionWrapper);
            let controlBarWrapper = null;
            if (document.getElementsByClassName(subtitleActiveClassName)[0]) {
                controlBarWrapper = document.getElementsByClassName(subtitleActiveClassName)[0];
            } else if (document.getElementsByClassName(subtitleInactiveClassName)[0]) {
                controlBarWrapper = document.getElementsByClassName(subtitleInactiveClassName)[0];
            }
            subtitlePositionObserver.observe(controlBarWrapper, {attributes: true, attributeFilter: ["class"]});
        }
    }
}
videoReadyObserver = new MutationObserver(prepareContainer);
videoReadyObserver.observe(document.documentElement, {childList:true, subtree:true});

translationObserver = new MutationObserver(addEnglishToOriginalCuesWrapper);
translationObserver.observe(wrapper, {characterData: true, subtree: true});

function numberCues(cues) {
    let cueIdCount = 0;
    for (const cue of cues) {
        cue.id = cueIdCount;
        cueIdCount++;
        cue.text = cue.parsedLine;
    }
    return cues;
}

chrome.runtime.onMessage.addListener(async function (response, sendResponse) {
    if (response["type"] === "mode") {
        mode = response["mode"];
        toggleTextTracks(mode, document.getElementsByTagName("VIDEO")[0], document.getElementsByClassName("vjs-text-track-display")[0]);
    } else if (response["type"] === "subtitles") {
        const url = response["url"];
        if (fetchedUrls.has(url)) {
            return true;
        }
        fetchedUrls.add(url);
        const vtt = response["original_vtt"];
        let cues = await parseVttCues(vtt);
        cues = numberCues(cues);
        needToRefreshTextTracks = refreshCues(cues, processedCueIds, cueDict);
        createTranslateElements(cues, wrapper);
        if (!getWrapper(document)) {
            const appendable = document.getElementById("player-video");
            appendable.prepend(wrapper);
        }
    }
    return true;
});


async function addEnglishToOriginalCuesWrapper(mutations, observer) {
    const video = document.getElementsByTagName("VIDEO")[0];
    if (needToRefreshTextTracks) {
        refreshTextTracks();
        needToRefreshTextTracks = false;
    }
    [cueDict, processedCueIds] = addEnglishToOriginalCues(serviceName, cueDict, processedCueIds, video, subtitleMovedUp);
    mode = await getSavedMode();
    toggleTextTracks(mode, document.getElementsByTagName("VIDEO")[0], document.getElementsByClassName("vjs-text-track-display")[0]);
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
    if (mutation.target.className.includes(subtitleActiveClassName)) {
        subtitleMovedUp = true;
        adjustSubtitlePosition(moveSubtitlesUpBy[serviceName]);

    } else if (mutation.target.className.includes(subtitleInactiveClassName)) {
        if (document.getElementsByTagName("VIDEO")[0].paused) return;
        subtitleMovedUp = false;
        adjustSubtitlePosition("auto");
    }
}