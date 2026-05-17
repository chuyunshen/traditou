/**
 * Advanced: Custom Adapter Example
 * 
 * Use this pattern when a service needs special handling beyond configuration.
 * By subclassing VideoPlayerAdapter, you can override specific methods while
 * keeping common logic in the base class.
 */

import { VideoPlayerAdapter } from "../core/VideoPlayerAdapter";

/**
 * Example: Netflix Adapter (if we supported it)
 * Netflix has unique challenges:
 * - Complex shadow DOM structure
 * - Multiple player instances
 * - Different UI state indicators
 */
export class NetflixAdapter extends VideoPlayerAdapter {
    constructor(config) {
        super(config);
        this.playerId = null;
    }

    /**
     * Override: Find the specific player instance
     * Netflix might load multiple players on the page
     */
    getVideoPlayer() {
        if (!this.playerId) {
            const players = document.querySelectorAll("video");
            // Find the currently active player
            for (const video of players) {
                if (this.isVideoPlaying(video)) {
                    this.playerId = video.id;
                    return video;
                }
            }
        }
        return document.getElementById(this.playerId);
    }

    isVideoPlaying(video) {
        return video.offsetParent !== null; // visible
    }

    /**
     * Override: Handle shadow DOM subtitles
     * Netflix uses shadow DOM which is harder to access
     */
    getOriginalSubtitles() {
        const video = this.getVideoPlayer();
        if (!video) return null;

        try {
            const shadowRoot = video.getRootNode();
            if (shadowRoot.host) {
                return shadowRoot.querySelector(".subtitles-container");
            }
        } catch (e) {
            console.warn("Could not access shadow DOM subtitles");
        }
        return null;
    }

    /**
     * Override: Custom mutation processing for Netflix's unique patterns
     */
    processMutation(mutation) {
        // Netflix has special data attributes
        if (mutation.target.getAttribute?.("data-player-state") === "playing") {
            // Netflix-specific handling
            this.modifyVideoPlayer();
        }

        // Still call parent implementation
        super.processMutation(mutation);
    }

    /**
     * Override: Get control bar for shadow DOM
     */
    getControlBar() {
        const video = this.getVideoPlayer();
        if (!video) return null;

        // Netflix uses data attributes for control detection
        return document.querySelector('[data-control-bar="true"]') ||
               super.getControlBar();
    }
}

/**
 * Example usage:
 * 
 * const netflixConfig = {
 *   serviceName: "netflix",
 *   videoSelector: "video",
 *   processCues: (cues) => cues,
 * };
 * 
 * const adapter = new NetflixAdapter(netflixConfig);
 * adapter.initialize();
 */

// ============================================================
// Another Example: Adapter with Custom Message Handler
// ============================================================

/**
 * Example: Service with special authentication needs
 */
export class AuthenticatedServiceAdapter extends VideoPlayerAdapter {
    /**
     * Override: Handle authentication before processing subtitles
     */
    async onSubtitlesReceived(response) {
        // Verify authentication before processing
        const isAuthenticated = await this.verifyUserAccess();
        if (!isAuthenticated) {
            console.warn("User not authenticated for subtitle access");
            return;
        }

        // Proceed with normal processing
        await super.onSubtitlesReceived(response);
    }

    /**
     * Custom: Verify user has access
     */
    async verifyUserAccess() {
        // Platform-specific authentication check
        const response = await fetch("/api/auth/verify");
        return response.ok;
    }
}

// ============================================================
// Pattern: Composition Over Inheritance
// ============================================================

/**
 * If you need multiple optional behaviors, use composition:
 */

class CachingLayer {
    constructor(adapter) {
        this.adapter = adapter;
        this.cache = new Map();
    }

    async getCues(url) {
        if (this.cache.has(url)) {
            console.log("Using cached cues for", url);
            return this.cache.get(url);
        }
        const cues = await this.adapter.onSubtitlesReceived(url);
        this.cache.set(url, cues);
        return cues;
    }
}

class AnalyticsLayer {
    constructor(adapter) {
        this.adapter = adapter;
    }

    onModeChange(mode) {
        // Track user behavior
        analytics.track("subtitle_mode_changed", { mode });
        this.adapter.onModeChange(mode);
    }

    async onSubtitlesReceived(response) {
        analytics.track("subtitles_loaded", { 
            service: this.adapter.config.serviceName,
            cueCount: response.cue_count 
        });
        return this.adapter.onSubtitlesReceived(response);
    }
}

/**
 * Usage with composition:
 * 
 * const adapter = new VideoPlayerAdapter(myConfig);
 * const withCache = new CachingLayer(adapter);
 * const withAnalytics = new AnalyticsLayer(withCache);
 * 
 * adapter.initialize();
 */

// ============================================================
// Best Practices for Custom Adapters
// ============================================================

/**
 * 1. Always call super.methodName() to maintain base functionality
 * 2. Use composition for cross-cutting concerns (caching, logging, etc.)
 * 3. Document which methods you're overriding and why
 * 4. Test the custom adapter in isolation
 * 5. Consider if the logic should be in config.onAdapterInitialize() instead
 * 6. If many services need the same override, move it to VideoPlayerAdapter
 * 7. Use TypeScript if possible for better IDE support
 */
