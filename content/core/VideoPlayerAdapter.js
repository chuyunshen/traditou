import {createWrapper, getWrapper, createTranslateElements, addRule, parseVttCues, 
    addEnglishToOriginalCues, getSavedMode, changeSubtitleFontSize, styleVideoCues, 
    adjustSubtitlePosition, toggleTextTracks, refreshCues, refreshTextTracks, hardResetCustomTextTracks} from "./utils";

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
            refreshCuesForNewEpisodes: false,
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
            videoReadyObserverConfig: { childList: true, subtree: true, characterData: true },
            subtitlePositionObserverConfig: { attributes: true },
            ...config
        };

        // State
        this.video = null;
        this.cueDict = {};
        this.processedCueIds = [];
        this.cueIdCount = 0;
        this.mode = null;
        this.fetchedUrls = new Set();
        this.subtitleMovedUp = null;
        this.modified = false;
        this.resizeObserverRegistered = false;
        this.subtitlePositionObserverRegistered = false;
        this.textTrackProtectionSetup = false;

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
        this.applySubtitleVisibilityRule();
        this.setupWrapper();
        this.setupMessageListener();
        this.setupVideoReadyObserver();
    }

    applySubtitleVisibilityRule() {
        if (!this.config.originalSubtitlesClassName) return;
        let styleEl = document.getElementById("traditou-subtitle-visibility");
        if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = "traditou-subtitle-visibility";
            document.head.appendChild(styleEl);
        }
        if (this.mode !== "off") {
            styleEl.textContent = `.${this.config.originalSubtitlesClassName} { display: none !important; }`;
        } else {
            styleEl.textContent = "";
        }
    }

    /**
     * Set up the invisible translation wrapper
     */
    setupWrapper() {
        console.log("Setting up translation wrapper");
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
     * Get the last video. For toutv, when playing the next video, the page just inserts
     * a new video with the same id.
     */
    getVideo() {
        const videos = document.querySelectorAll(this.config.videoSelector);
        return videos.length > 0 ? videos[videos.length - 1] : null;
    }

    /**
     * Called when DOM mutations indicate the video player is ready
     */
    onVideoReady(mutations, observer) {
        console.log("running onVideoReady")
        const currentVideo = this.getVideo();
        if (!currentVideo) return;


        if (this.video !== currentVideo || (this.video && this.video.currentSrc !== currentVideo.currentSrc)) {
            console.log("🔄 New video detected! Resetting track injection pipeline.");
            
            // 1. Update our tracking reference
            this.video = currentVideo;

            // 2. Reset the lifecycle guard flags for this element context
            this.resizeObserverRegistered = false;
            this.subtitlePositionObserverRegistered = false;
            this.textTrackProtectionSetup = false;

            // 3. Clear data dictionaries if config calls for an episode refresh
            if (this.config.refreshCuesForNewEpisodes) {
                this.cueDict = {};
                this.processedCueIds = [];
                this.cueIdCount = 0;
                if (document.getElementById("invisible-translate-wrapper")) {
                    document.getElementById("invisible-translate-wrapper").replaceChildren();
                }
            }
        }

        this.prepareContainer(mutations, observer);
    }


    /**
     * Prepare the video player container - set up secondary observers
     */
    prepareContainer(mutations, observer) {
        console.log("Preparing container")
        if (!this.resizeObserverRegistered) {
            console.log("Setting up resize observer");
            this.setupResizeObserver();
        }

        if (!this.subtitlePositionObserverRegistered) {
            console.log("Setting up subtitle position observer");
            this.setupSubtitlePositionObserver();
        }

        if (!this.textTrackProtectionSetup) {
            console.log("Setting up text track protection");
            this.setupTextTrackProtection();
        }
    }

    setupTextTrackProtection() {
        const video = this.getVideo();
        if (!video) return;
        this.textTrackProtectionSetup = true;

        video.textTracks.addEventListener("change", () => {
            if (this.mode === "off") return;
            for (const track of video.textTracks) {
                if (track.label === this.mode && track.mode !== "showing") {
                    toggleTextTracks(this.mode, video, this.getOriginalSubtitles());
                    return;
                }
            }
        });
    }

    /**
     * Set up resize observer to adjust subtitle font size
     */
    setupResizeObserver() {
        const video = this.getVideo();
        if (video) {
            const resizeObserver = new ResizeObserver(() => changeSubtitleFontSize(video));
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

        const video = this.getVideo();
        if (!video) return;
        if (isUserActive && (this.subtitleMovedUp === null || !this.subtitleMovedUp)) {
            this.subtitleMovedUp = true;
            adjustSubtitlePosition(video, this.config.moveSubtitlesUpBy);
        } else if (isUserInactive && (this.subtitleMovedUp === null || this.subtitleMovedUp)) {
            if (!video.paused) {
                this.subtitleMovedUp = false;
                adjustSubtitlePosition(video, "auto");
            }
        }
    }

    /**
     * Set up chrome message listener
     */
    setupMessageListener() {
        console.log("Setting up message listener for subtitle fetching");
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "FETCH_SUBTITLE_FROM_PAGE") {
          
          // Fetch directly using the website's native context privileges
          fetch(message.url)
            .then(response => {
              if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
              return response.text();
            })
            .then(textPayload => {
              // Reconstruct the message object your parser expects
              const parserPayload = {
                type: "subtitles",
                url: message.url
              };
      
              if (message.format === "ttml") {
                parserPayload["original_ttml"] = textPayload;
              } else {
                parserPayload["original_vtt"] = textPayload;
              }
      
              // Direct this payload into your original processing loop
              // (Replace handleSubtitlesReceived with your project's main subtitle function)
              this.onMessage(parserPayload, sender, sendResponse);
            })
            .catch(err => console.error("Page-level subtitle fetch failed:", err));
        }
      });
    }

    /**
     * Handle messages from background script
     */
    async onMessage(response, sender, sendResponse) {
        console.log("Received message in content script:", response);
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
        this.applySubtitleVisibilityRule();
        const video = this.getVideo();
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

        console.log(`Received subtitles for URL: ${url}`);
        // Parse and process cues
        let frenchCues = await parseVttCues(original_vtt);
        console.log("Parsed french cues from VTT:")
        console.log(frenchCues)
        const processedCues = this.config.processCues(frenchCues, this.cueIdCount);
        console.log("Processed cues after service-specific processing:")
        console.log(processedCues)
        if (Array.isArray(processedCues) && processedCues.length === 2 && Array.isArray(processedCues[0])) {
            [frenchCues, this.cueIdCount] = processedCues;
            for (const cue of frenchCues) {
                if (this.processedCueIds.includes(cue.id)) continue;
                if (!this.cueDict.hasOwnProperty(cue.id)) {
                    cue.isElementCreated = false;
                    this.cueDict[cue.id] = cue;
                }
            }
        } else {
            frenchCues = processedCues;
        }

        if (this.config.refreshCuesForNewEpisodes) {
            refreshCues(frenchCues, this.processedCueIds, this.cueDict);
        }
        await createTranslateElements(frenchCues, this.wrapper);
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
     * Handle translation mutations - when Google Translate updates the hidden divs
     */
    async onTranslationMutation(mutations, observer) {
        const video = this.getVideo();

        [this.cueDict, this.processedCueIds] = addEnglishToOriginalCues(
            this.config.serviceName,
            this.cueDict,
            this.processedCueIds,
            video,
            this.subtitleMovedUp,
            this.config.moveSubtitlesUpBy
        );
        console.log("cueDict after adding English cues")
        console.log(this.cueDict)
        console.log("processedCueIds after adding English cues")
        console.log(this.processedCueIds)

        this.originalSubtitles = this.getOriginalSubtitles();
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
