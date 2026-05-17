/**
 * Service Configurations for different streaming platforms
 * Each configuration object defines platform-specific selectors and behaviors
 */

import { squashCues } from "./utils";
import { squashCuesNoovo } from "./utils";

// ============================================================
// TELEQUEBEC - Uses Brightcove video player
// ============================================================
export const telequebecConfig = {
    serviceName: "telequebec",
    videoSelector: "video",
    moveSubtitlesUpBy: -5,
    // originalSubtitleIdToHide: "français",
    // Brightcove uses video-js player
    controlBarSelector: "video-js",
    userActiveClassName: "vjs-user-active",
    userInactiveClassName: "vjs-user-inactive",
    originalSubtitlesClassName: "vjs-text-track-display",
    subtitlePositionObserverConfig: {
        attributes: true,
        attributeFilter: ["class"]
    },
    // Telequebec has special time display element
    onAdapterInitialize(adapter) {
        // Disable translation on time display
        const timeDisplay = document.getElementsByClassName(
            "vjs-current-time vjs-time-control vjs-control"
        )[0];
        if (timeDisplay) {
            timeDisplay.translate = "no";
            timeDisplay.setAttribute("translate", "no");
        }
    },
    processCues: squashCues,
};

// ============================================================
// PRIME VIDEO - Uses custom web player
// ============================================================
export const primeConfig = {
    serviceName: "prime",
    videoSelector: "video",
    moveSubtitlesUpBy: -6,
    originalSubtitlesClassName: "atvwebplayersdk-captions-overlay",
    controlBarSelector: ".atvwebplayersdk-overlays-container",
    wrapperParentSelector: ".atvwebplayersdk-overlays-container",
    videoReadyObserverConfig: {
        childList: true,
        subtree: true,
        attributes: true
    },
    // Prime has different mutation patterns for detecting player
    getControlBar(adapter) {
        const container = document.getElementsByClassName("atvwebplayersdk-overlays-container")[0];
        return container ? container.children[0] : null;
    },
    processCues: (cues) => cues, // No special processing
};

// ============================================================
// NOOVO - Uses Shaka player
// ============================================================
export const noovoConfig = {
    serviceName: "noovo",
    videoSelector: "video",
    moveSubtitlesUpBy: -6,
    originalSubtitlesClassName: "shaka-text-container",
    wrapperParentSelector: ".jasper-player-root__container--W1IfG",
    controlBarSelector: ".jasper-player-overlay__container--vXxZG",
    userActiveClassName: null,
    userInactiveClassName: "jasper-player-overlay__hidden--xbqt7",
    subtitlePositionObserverConfig: {
        attributes: true
    },
    processCues: squashCuesNoovo,
};

// ============================================================
// TOU.TV - Uses video.js player
// ============================================================
export const toutvConfig = {
    serviceName: "toutv",
    videoSelector: "video",
    moveSubtitlesUpBy: -6,
    originalSubtitlesClassName: "rc-cues-container",
    wrapperParentSelector: "#player-video",
    userActiveClassName: "vjs-user-active",
    userInactiveClassName: "vjs-user-inactive",
    subtitlePositionObserverConfig: {
        attributes: true,
        attributeFilter: ["class"]
    },
    getControlBar(adapter) {
        if (document.getElementsByClassName("vjs-user-active")[0]) {
            return document.getElementsByClassName("vjs-user-active")[0];
        } else if (document.getElementsByClassName("vjs-user-inactive")[0]) {
            return document.getElementsByClassName("vjs-user-inactive")[0];
        }
        return null;
    },
    // Tou.tv uses custom cue numbering
    processCues(cues) {
        let cueIdCount = 0;
        for (const cue of cues) {
            cue.id = cueIdCount;
            cueIdCount++;
            cue.text = cue.parsedLine;
        }
        return cues;
    },
};

// ============================================================
// TV5
// ============================================================
export const tv5Config = {
    serviceName: "tv5",
    videoSelector: "video",
    moveSubtitlesUpBy: -5,
    originalSubtitlesClassName: "bmpui-ui-subtitle-label",
    controlBarSelector: "video-js",
    userActiveClassName: "vjs-user-active",
    userInactiveClassName: "vjs-user-inactive",
    subtitlePositionObserverConfig: {
        attributes: true,
        attributeFilter: ["class"]
    },
    processCues: squashCues,
};

// ============================================================
// TEMPLATE - Use this to add a new streaming service
// ============================================================
export const newServiceTemplate = {
    serviceName: "new-service",
    videoSelector: "video", // CSS selector for video element
    originalSubtitlesClassName: null, // Class of original subtitles container
    originalSubtitleIdToHide: null, // ID of original subtitle track to hide
    wrapperParentSelector: null, // Where to append the translation wrapper
    controlBarSelector: null, // Where to find the control bar
    userActiveClassName: null, // Class when user is interacting
    userInactiveClassName: null, // Class when user is not interacting
    subtitlePositionObserverConfig: { attributes: true },
    videoReadyObserverConfig: { childList: true, subtree: true },
    // Optional: custom control bar finder
    getControlBar(adapter) {
        return null;
    },
    // Optional: custom initialization
    onAdapterInitialize(adapter) {
        // Platform-specific setup
    },
    // Required: cue processing function
    processCues(cues) {
        return cues;
    },
};
