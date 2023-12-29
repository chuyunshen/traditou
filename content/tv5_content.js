
import {createWrapper, getWrapper, createTranslateElements, addRule, parseVttCues, 
    addEnglishToOriginalCues, toggleTextTracks, getSavedMode, changeSubtitleFontSize, 
    styleVideoCues, adjustSubtitlePosition, numberCues} from "./utils";
import {moveSubtitlesUpBy} from "./config";

var cueDict = {};  // it's a global variable because there doesnt seem to be ways to pass extra params into the mutation observer.
var processedCueIds = [];
var wrapper = createWrapper(document);
var modified = false;
var cueIdCount = 0;

var mode;
var fetchedUrls = new Set();
var subtitleMovedUp = null;
var resizeObserverRegistered = false;
var subtitlePositionObserverRegistered = false;
var originalSubtitlesClassName = "bmpui-ui-subtitle-overlay";
var serviceName = "tv5";
var hideableControlBarClassName = "bmpui-ui-uicontainer";
var videoWrapperClassName = "bitmovinplayer-container";
var controlBarhiddenClassName = "bmpui-controls-hidden";

var prepareContainer = function(mutations, observer){
    for (const mutation of mutations){
        if (mutation.target.className && 
            typeof mutation.target.className === "string" && 
            mutation.target.className.includes(originalSubtitlesClassName)) {
            if (!modified) {
                modifyVideoPlayer();
                modified = true;
            }
            if (mode !== "off") {
                originalSubtitles = document.getElementsByClassName(originalSubtitlesClassName)[0];
                if (originalSubtitles) {
                    originalSubtitles.style.display = 'none';
                } 
            }
        }
    }
    if (!resizeObserverRegistered) {
        // resize font based on screen size
        var resizeObserver = new ResizeObserver(changeSubtitleFontSize);
        if (document.getElementsByTagName("video")[0]) {
            resizeObserver.observe(document.getElementsByTagName("video")[0]);
            resizeObserverRegistered = true;
        }
    }

    if (!subtitlePositionObserverRegistered) {
        subtitlePositionObserver = new MutationObserver(adjustSubtitlePositionWrapper);
        let node = document.getElementsByClassName(hideableControlBarClassName)[0]
        if (node) {
            subtitlePositionObserver.observe( node, {attributes: true});
            subtitlePositionObserverRegistered = true;
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
        originalSubtitles = document.getElementsByClassName(originalSubtitlesClassName)[0];
        toggleTextTracks(mode, document.getElementsByTagName("VIDEO")[0], originalSubtitles);
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
        [cues, cueIdCount] = numberCues(cues, cueIdCount);
        for (const cue of cues) {
            if (processedCueIds.includes(cue.id)) continue;
            if (!cueDict.hasOwnProperty(cue.id)) {
                cueDict[cue.id] = cue;
            }
        }

        createTranslateElements(cues, wrapper);
        if (!getWrapper(document)) {
            const videoWrapper = document.getElementsByClassName(videoWrapperClassName)[0]
            videoWrapper.appendChild(wrapper);
        }
    }
    return true;
});


async function addEnglishToOriginalCuesWrapper(mutations, observer) {
    const video = document.getElementsByTagName("video")[0];
    [cueDict, processedCueIds] = addEnglishToOriginalCues(serviceName, cueDict, processedCueIds, video, subtitleMovedUp);
    originalSubtitles = document.getElementsByClassName(originalSubtitlesClassName)[0];
    mode = await getSavedMode();
    toggleTextTracks(mode, document.getElementsByTagName("video")[0], originalSubtitles);
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

    // user active
    if (!mutation.target.className.includes(controlBarhiddenClassName)) {
        subtitleMovedUp = true;
        adjustSubtitlePosition(moveSubtitlesUpBy[serviceName]);

    // user inactive
    } else {
        if (document.getElementsByTagName("video")[0].paused) return;
        subtitleMovedUp = false;
        adjustSubtitlePosition("auto");
    }
}