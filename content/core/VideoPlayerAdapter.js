import {createWrapper, getWrapper, createTranslateElements, addRule, parseVttCues, 
    addEnglishToOriginalCues, getSavedMode, changeSubtitleFontSize, styleVideoCues, 
    adjustSubtitlePosition, toggleTextTracks, refreshCues, refreshTextTracks} from "./utils";

/**
 * VideoPlayerAdapter: Base class for handling subtitle injection across different streaming platforms
 * Uses dependency injection to support multiple video player implementations with minimal code duplication
 */
export class VideoPlayerAdapter {
    constructor(config) {
        // Service configuration - override in subclasses or pass via config
        this.config = {
            serviceName: "unknown",
            // Selectors for finding elements
            videoSelector: "video",
            moveSubtitlesUpBy: -6,
            originalSubtitlesClassName: null,
            originalSubtitleIdToHide: null,
            controlBarSelector: null,
            wrapperParentSelector: null,
            // Class names for UI states
            userActiveClassName: null,
            userInactiveClassName: null,
            // Functions for cue processing
            processCues: (cues) => cues,
            // Observer configuration
            videoReadyObserverConfig: { childList: true, subtree: true },
            // originalSubtitleObserverConfig: { childList: true, subtree: true, characterData: true, attributes: true }, 
            subtitlePositionObserverConfig: { attributes: true },
            ...config
        };

        // State
        this.cueDict = {};
        this.processedCueIds = [];
        this.cueIdCount = 0;
        this.mode = null;
        this.fetchedUrls = new Set();
        this.subtitleMovedUp = null;
        this.modified = false;
        this.needToRefreshTextTracks = false;
        this.resizeObserverRegistered = false;
        // this.originalSubtitleObserverRegistered = false;
        this.subtitlePositionObserverRegistered = false;

        this.wrapper = createWrapper(document);
        this.originalSubtitles = null;

        // Observers
        this.videoReadyObserver = null;
        this.translationObserver = null;
        this.originalSubtitleObserver = null;
        this.subtitlePositionObserver = null;
        this.textTrackObserver = null;
    }

    /**
     * Initialize the adapter - set up all observers and message listeners
     */
    async initialize() {
        this.mode = await getSavedMode();
        styleVideoCues();
        this.setupWrapper();
        this.setupMessageListener();
        this.setupVideoReadyObserver();
    }

    /**
     * Set up the invisible translation wrapper
     */
    setupWrapper() {
        document.body.appendChild(this.wrapper);
        this.translationObserver = new MutationObserver((mutations, observer) => 
            this.onTranslationMutation(mutations, observer)
        );
        this.translationObserver.observe(this.wrapper, {
            characterData: true,
            subtree: true,
            childList: true,
            attributes: true
        });
    }

    /**
     * Set up the video ready observer that detects when the video player is loaded
     */
    setupVideoReadyObserver() {
        this.videoReadyObserver = new MutationObserver((mutations, observer) => 
            this.onVideoReady(mutations, observer)
        );
        this.videoReadyObserver.observe(document.documentElement, this.config.videoReadyObserverConfig);
    }

    /**
     * Called when DOM mutations indicate the video player is ready
     */
    onVideoReady(mutations, observer) {
        this.prepareContainer(mutations, observer);
    }


    /**
     * Prepare the video player container - set up secondary observers
     */
    prepareContainer(mutations, observer) {
        for (const mutation of mutations) {
            this.processMutation(mutation);
        }

        // if (!this.originalSubtitleObserverRegistered) {
        //     this.setupOriginalSubtitleObserver();
        // }

        if (!this.resizeObserverRegistered) {
            this.setupResizeObserver();
        }

        if (!this.subtitlePositionObserverRegistered) {
            this.setupSubtitlePositionObserver();
        }
    }

    /**
     * Process individual mutations - override in subclasses for platform-specific logic
     */
    processMutation(mutation) {
        // Default: hide original subtitles if they appear
        if (this.config.originalSubtitlesClassName &&
            mutation.target.className &&
            typeof mutation.target.className === "string" &&
            mutation.target.className.includes(this.config.originalSubtitlesClassName)) {
            
            const originalSubtitles = this.getOriginalSubtitles();
            
            const video = document.querySelector(this.config.videoSelector);
            toggleTextTracks(this.mode, video, originalSubtitles);
            console.log("toggled text tracks in processMutation")
        }
    }

    /**
     * Set up resize observer to adjust subtitle font size
     */
    setupResizeObserver() {
        const video = document.querySelector(this.config.videoSelector);
        if (video) {
            const resizeObserver = new ResizeObserver(() => changeSubtitleFontSize());
            resizeObserver.observe(video);
            this.resizeObserverRegistered = true;
        }
    }

    /**
     * Set up subtitle position observer
     */
    setupSubtitlePositionObserver() {
        const controlBar = this.getControlBar();
        if (controlBar) {
            this.subtitlePositionObserver = new MutationObserver((mutations, observer) =>
                this.onSubtitlePositionMutation(mutations, observer)
            );
            this.subtitlePositionObserver.observe(
                controlBar,
                this.config.subtitlePositionObserverConfig
            );
            this.subtitlePositionObserverRegistered = true;
        }
    }

    /**
     * Get the control bar element - override in subclasses if needed
     */
    getControlBar() {
        if (this.config.controlBarSelector) {
            return document.querySelector(this.config.controlBarSelector);
        }

        // Fallback: try to find by active/inactive class names
        if (this.config.userActiveClassName) {
            return document.querySelector(`.${this.config.userActiveClassName}`);
        }

        return null;
    }

    /**
     * Handle subtitle position mutations (user active/inactive)
     */
    onSubtitlePositionMutation(mutations, observer) {
        if (mutations.length === 0) return;

        const mutation = mutations[mutations.length - 1];
        const className = mutation.target.className || "";

        const isUserActive = this.config.userActiveClassName && className.includes(this.config.userActiveClassName);
        const isUserInactive = this.config.userInactiveClassName && className.includes(this.config.userInactiveClassName);

        if (isUserActive && (this.subtitleMovedUp === null || !this.subtitleMovedUp)) {
            this.subtitleMovedUp = true;
            adjustSubtitlePosition(this.config.moveSubtitlesUpBy);
        } else if (isUserInactive && (this.subtitleMovedUp === null || this.subtitleMovedUp)) {
            const video = document.querySelector(this.config.videoSelector);
            if (video && !video.paused) {
                this.subtitleMovedUp = false;
                adjustSubtitlePosition("auto");
            }
        }
    }

    /**
     * Set up chrome message listener
     */
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((response, sender, sendResponse) => {
            this.onMessage(response, sender, sendResponse);
            return true;
        });
    }

    /**
     * Handle messages from background script
     */
    async onMessage(response, sender, sendResponse) {
        if (response.type === "mode") {
            this.onModeChange(response.mode);
        } else if (response.type === "subtitles") {
            await this.onSubtitlesReceived(response);
        }
    }

    /**
     * Handle mode change (dual, english, french, off)
     */
    onModeChange(mode) {
        this.mode = mode;
        const video = document.querySelector(this.config.videoSelector);
        this.originalSubtitles = this.getOriginalSubtitles();
        toggleTextTracks(mode, video, this.originalSubtitles);
    }

    /**
     * Handle newly received subtitles
     */
    async onSubtitlesReceived(response) {
        const { url, original_vtt } = response;

        // Avoid processing duplicate VTT files
        if (this.fetchedUrls.has(url)) {
            return;
        }
        this.fetchedUrls.add(url);

        // Parse and process cues
        let cues = await parseVttCues(original_vtt);
        const processedCues = this.config.processCues(cues, this.cueIdCount);
        if (Array.isArray(processedCues) && processedCues.length === 2 && Array.isArray(processedCues[0])) {
            cues = processedCues[0];
            this.cueIdCount = processedCues[1];
        } else {
            cues = processedCues;
        }

        // Update cue dictionary and refresh tracks if needed
        this.needToRefreshTextTracks = refreshCues(cues, this.processedCueIds, this.cueDict);
        createTranslateElements(cues, this.wrapper);

        // Append wrapper to page if not already there
        this.ensureWrapperInDOM();
    }

    /**
     * Get original subtitles element
     */
    getOriginalSubtitles() {
        if (this.config.originalSubtitlesClassName) {
            return document.getElementsByClassName(this.config.originalSubtitlesClassName)[0] || null;
        } 
        return null;
    }

    /**
     * Ensure the translation wrapper is in the DOM
     */
    ensureWrapperInDOM() {
        if (!getWrapper(document)) {
            let parent = null;
            if (this.config.wrapperParentSelector) {
                parent = document.querySelector(this.config.wrapperParentSelector);
            }
            if (parent) {
                parent.appendChild(this.wrapper);
            } else {
                document.body.appendChild(this.wrapper);
            }
        }
    }

    /**
     * Handle translation mutations - when Google Translate updates the hidden divs
     */
    async onTranslationMutation(mutations, observer) {
        const video = document.querySelector(this.config.videoSelector);

        if (this.needToRefreshTextTracks) {
            refreshTextTracks();
            this.needToRefreshTextTracks = false;
        }

        [this.cueDict, this.processedCueIds] = addEnglishToOriginalCues(
            this.config.serviceName,
            this.cueDict,
            this.processedCueIds,
            video,
            this.subtitleMovedUp
        );

        this.originalSubtitles = this.getOriginalSubtitles();
        toggleTextTracks(this.mode, video, this.originalSubtitles);
    }

    /**
     * Modify video player to allow right-click
     */
    modifyVideoPlayer() {
        if (this.modified) return;

        const elements = document.getElementsByTagName("*");
        for (let i = 0; i < elements.length; ++i) {
            elements[i].addEventListener('contextmenu', (e) => e.stopPropagation(), true);
            elements[i].oncontextmenu = null;
        }

        this.modified = true;
    }
}
