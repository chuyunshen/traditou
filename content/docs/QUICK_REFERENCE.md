# Quick Reference: VideoPlayerAdapter Architecture

## File Organization

```
content/
├── VideoPlayerAdapter.js           # Base class with core logic
├── serviceConfigs.js               # Configuration objects for each service
├── telequebec_content_refactored.js # 10-line content script
├── prime_content_refactored.js
├── noovo_content_refactored.js
├── toutv_content_refactored.js
├── tv5_content_refactored.js
├── utils.js                        # Helper functions (unchanged)
├── config.js                       # Service-specific constants (unchanged)
├── REFACTORING_GUIDE.md            # Detailed documentation
└── AdvancedAdapterExamples.js      # Complex customization patterns
```

## Data Flow

```
User loads video page
        ↓
Content script loads and instantiates adapter
        ↓
adapter.initialize()
        ├→ Creates translation wrapper (invisible divs)
        ├→ Sets up videoReadyObserver (detects player load)
        ├→ Sets up translationObserver (watches for Google Translate)
        ├→ Sets up chrome message listener
        └→ Applies global video cue styles
        ↓
Extension detects subtitles in network response
        ↓
background.js sends "subtitles" message with VTT data
        ↓
adapter.onMessage() receives it
        ├→ Parses VTT → cues
        ├→ Processes cues (squashing, numbering, etc.)
        ├→ Stores in cueDict
        ├→ Creates invisible translation divs
        └→ Appends wrapper to page
        ↓
Google Translate translates the hidden divs
        ↓
translationObserver fires (DOM mutation detected)
        ↓
adapter.onTranslationMutation()
        ├→ Reads translated text from divs
        ├→ Calls addEnglishToOriginalCues()
        ├→ Creates 3 video text tracks (dual/english/french)
        └→ Calls toggleTextTracks() to show correct track
        ↓
User clicks popup to change subtitle mode
        ↓
background.js sends "mode" message
        ↓
adapter.onModeChange()
        ├→ Updates this.mode
        └→ Calls toggleTextTracks() to show selected track
```

## Configuration Template

```javascript
export const myServiceConfig = {
  // ===== REQUIRED =====
  serviceName: "service-id",                    // Unique identifier
  videoSelector: "video",                       // Find video element
  
  // ===== OPTIONAL: SELECTORS =====
  originalSubtitlesClassName: "subtitles",      // Hide these
  originalSubtitleIdToHide: "track-id",         // OR hide this
  wrapperParentSelector: "#container",          // Append wrapper here
  controlBarSelector: ".controls",              // Find controls for positioning
  userActiveClassName: "active",                // When user interacts
  userInactiveClassName: "inactive",            // When user doesn't
  
  // ===== OPTIONAL: FUNCTIONS =====
  processCues: (cues) => cues,                  // Process cues (required!)
  
  getControlBar(adapter) {                      // Custom control finder
    return document.querySelector(".my-controls");
  },
  
  onAdapterInitialize(adapter) {                // Custom setup
    // Platform-specific initialization
  }
};
```

## Common Config Examples

### Brightcove Player (Telequebec, TV5)
```javascript
{
  videoSelector: "video",
  originalSubtitleIdToHide: "track-id",  // Hide by ID instead of class
  controlBarSelector: "video-js",
  userActiveClassName: "vjs-user-active",
  userInactiveClassName: "vjs-user-inactive"
}
```

### Shaka Player (Noovo)
```javascript
{
  videoSelector: "video",
  originalSubtitlesClassName: "shaka-text-container",
  wrapperParentSelector: ".player-root",
  userInactiveClassName: "player-hidden"  // Only inactive state
}
```

### Custom Web Player (Prime Video)
```javascript
{
  videoSelector: "video",
  originalSubtitlesClassName: "atvwebplayersdk-captions-overlay",
  wrapperParentSelector: ".player-overlay",
  controlBarSelector(adapter) {
    const container = document.querySelector(".controls-container");
    return container?.firstChild;
  }
}
```

### Video.js Variants (Tou.tv)
```javascript
{
  videoSelector: "video",
  originalSubtitlesClassName: "rc-cues-container",
  wrapperParentSelector: "#player-container",
  processCues(cues) {
    // Custom numbering for this service
    return cues.map((cue, i) => ({ ...cue, id: i }));
  }
}
```

## State Variables (Inside Adapter)

```javascript
this.cueDict = {};                    // Subtitles being processed
this.processedCueIds = [];            // IDs already added to video
this.mode = null;                     // Current mode (dual/english/french/off)
this.fetchedUrls = new Set();         // VTT URLs already processed
this.subtitleMovedUp = null;          // Subtitle position state
this.modified = false;                // Player already modified
this.needToRefreshTextTracks = false;  // Need to reset tracks
this.wrapper = null;                  // Translation wrapper element
this.originalSubtitles = null;        // Original subtitle element
```

## Key Methods

| Method | Called By | Purpose |
|--------|-----------|---------|
| `initialize()` | Content script | Set up everything |
| `setupWrapper()` | initialize() | Create translation wrapper |
| `setupVideoReadyObserver()` | initialize() | Detect player load |
| `setupResizeObserver()` | prepareContainer() | Size subtitles with window |
| `setupSubtitlePositionObserver()` | prepareContainer() | Track user interaction |
| `setupMessageListener()` | initialize() | Listen for messages |
| `onVideoReady()` | videoReadyObserver | Player detected |
| `prepareContainer()` | onVideoReady() | Set up secondary observers |
| `processMutation()` | prepareContainer() | Handle individual mutations |
| `onTranslationMutation()` | translationObserver | Google Translate fired |
| `onMessage()` | chrome message listener | Receive mode/subtitle data |
| `onModeChange()` | onMessage() | User selected new mode |
| `onSubtitlesReceived()` | onMessage() | New subtitle data arrived |
| `getControlBar()` | setupSubtitlePositionObserver() | Find control bar |
| `getOriginalSubtitles()` | Various | Get subtitle element |
| `ensureWrapperInDOM()` | onSubtitlesReceived() | Add wrapper to page |

## Observer Patterns

### VideoReadyObserver
- Watches: `document.documentElement`
- Fires: When player elements appear in DOM
- Action: Sets up secondary observers (resize, position tracking)

### ResizeObserver
- Watches: Video element
- Fires: When video resizes
- Action: Updates subtitle font size via `changeSubtitleFontSize()`

### SubtitlePositionObserver
- Watches: Control bar element
- Fires: When user clicks/hovers (class changes)
- Action: Moves subtitles up/down via `adjustSubtitlePosition()`

### TranslationObserver
- Watches: Translation wrapper div
- Fires: When Google Translate updates hidden divs
- Action: Reads translations and adds to video via `addEnglishToOriginalCues()`

## Message Flow

### From Background Script → Adapter

```javascript
// Mode change (user clicked popup)
{
  type: "mode",
  mode: "dual-mode" | "english-mode" | "french-mode" | "off"
}

// New subtitles available
{
  type: "subtitles",
  url: "https://example.com/captions.vtt",
  original_vtt: "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nHello"
}
```

## Adding Logging

```javascript
// In config
onAdapterInitialize(adapter) {
  const origOnMessage = adapter.onMessage.bind(adapter);
  adapter.onMessage = function(response, sender, sendResponse) {
    console.log("Message:", response.type, response);
    return origOnMessage(response, sender, sendResponse);
  };
}
```

## Debugging Checklist

- [ ] Content script loads (check manifest.json url_matches)
- [ ] Config object has all required properties
- [ ] CSS selectors return elements (`document.querySelector()`)
- [ ] Video element found by selector
- [ ] Messages received (check chrome console)
- [ ] Wrapper appears in page (check DevTools)
- [ ] Observers fire (add console.log in callbacks)
- [ ] Cues appear in video (check video.textTracks)
- [ ] Translations load from Google (check hidden divs)

## Performance Tips

1. **Cache selectors**: Use `querySelector()` sparingly, store references
2. **Debounce mutations**: Many mutations fire quickly, aggregate them
3. **Lazy observers**: Set up observers only when needed
4. **Cleanup**: Remove observers when videos change to avoid memory leaks
5. **Minimize DOM traversal**: Use IDs and classes, avoid complex queries

## Browser Compatibility

- **Chrome**: 90+
- **Edge**: 90+
- Requires:
  - MutationObserver
  - ResizeObserver
  - Chrome extension messaging API
  - Fetch API
  - Promise/async-await
