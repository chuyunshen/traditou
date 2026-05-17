# Traditou Refactored Architecture

## Overview

The refactored codebase uses **inheritance** and **dependency injection** to eliminate duplication across streaming service implementations. Instead of writing 130-180 lines of duplicated code for each service, you now define a simple configuration object and instantiate a single `VideoPlayerAdapter`.

## Architecture

### Three-Layer Design

```
┌─────────────────────────────────────────────────────────────┐
│  Service Content Scripts (telequebec_content.js, etc.)      │
│  - 10 lines: Import adapter & config, then initialize       │
└────────────────┬────────────────────────────────────────────┘
                 │ instantiate with config
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  VideoPlayerAdapter (VideoPlayerAdapter.js)                 │
│  - Core logic for all streaming platforms                   │
│  - Manages observers, state, messaging, cue processing      │
│  - Hooks for platform-specific customization                │
└────────────────┬────────────────────────────────────────────┘
                 │ uses configuration
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Service Configurations (serviceConfigs.js)                 │
│  - Platform-specific selectors, class names, hooks          │
│  - Minimal, declarative configuration objects               │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. VideoPlayerAdapter (Base Class)

Encapsulates all common subtitle injection logic:

- **State Management**: cueDict, processedCueIds, mode, fetchedUrls, etc.
- **Observer Setup**: videoReadyObserver, translationObserver, subtitlePositionObserver
- **Message Handling**: Listens for mode changes and subtitle data
- **Cue Processing**: Parses VTT, applies translations, updates video tracks
- **DOM Manipulation**: Hides original subtitles, manages translation wrapper

**Methods:**
- `initialize()` - Sets up everything
- `setupWrapper()` - Creates invisible translation container
- `setupVideoReadyObserver()` - Detects when player is loaded
- `onVideoReady()` - Called when player appears
- `setupResizeObserver()` - Adjusts subtitle size with window
- `setupSubtitlePositionObserver()` - Handles user interaction
- `setupMessageListener()` - Listens for chrome messages
- `getControlBar()` - Finds the control bar element (overridable)
- `getOriginalSubtitles()` - Gets the original subtitle element
- `onTranslationMutation()` - Processes translated text from Google
- `processMutation()` - Handles individual DOM mutations (overridable)

### 2. Service Configurations

Dependency-injected configuration objects that define platform-specific details:

```javascript
export const telequebecConfig = {
  serviceName: "telequebec",           // Identifier
  videoSelector: "video",               // CSS selector
  originalSubtitleIdToHide: "français", // ID of track to hide
  controlBarSelector: "video-js",       // Where to find controls
  userActiveClassName: "vjs-user-active",
  userInactiveClassName: "vjs-user-inactive",
  processCues: squashCues,              // Cue processing function
  onAdapterInitialize(adapter) { }      // Custom initialization hook
};
```

**Configuration Properties:**

| Property | Purpose | Example |
|----------|---------|---------|
| `serviceName` | Unique identifier | `"prime"`, `"noovo"` |
| `videoSelector` | Finds video element | `"video"` |
| `originalSubtitlesClassName` | Class of subtitle container | `"shaka-text-container"` |
| `originalSubtitleIdToHide` | ID of track to hide | `"français"` |
| `wrapperParentSelector` | Where to append translation wrapper | `"#player-video"` |
| `controlBarSelector` | CSS selector for control bar | `".player-controls"` |
| `userActiveClassName` | Class when user interacts | `"vjs-user-active"` |
| `userInactiveClassName` | Class when user inactive | `"vjs-user-inactive"` |
| `processCues` | Function to process cues | `squashCues`, `squashCuesNoovo` |
| `onAdapterInitialize` | Custom setup hook | Platform-specific initialization |

## Usage

### Before (130+ lines per service):

```javascript
// telequebec_content.js
var cueDict = {};
var processedCueIds = [];
var mode;
var modified = false;
// ... 100+ more lines of setup, observers, message handlers ...
```

### After (10 lines per service):

```javascript
// telequebec_content.js
import { VideoPlayerAdapter } from "./VideoPlayerAdapter";
import { telequebecConfig } from "./serviceConfigs";

const adapter = new VideoPlayerAdapter(telequebecConfig);
adapter.initialize();
```

## Adding a New Streaming Service

### Step 1: Define Configuration

In `serviceConfigs.js`, add your service configuration:

```javascript
export const myServiceConfig = {
  serviceName: "my-service",
  videoSelector: "video",
  originalSubtitlesClassName: "my-subtitles",
  controlBarSelector: ".my-controls",
  userActiveClassName: "active",
  userInactiveClassName: "inactive",
  processCues(cues) {
    // Any service-specific cue processing
    return cues;
  },
  // Optional: Custom initialization
  onAdapterInitialize(adapter) {
    // Platform-specific setup (e.g., hide ads, customize styling)
  }
};
```

### Step 2: Create Content Script

Create `myservice_content.js`:

```javascript
import { VideoPlayerAdapter } from "./VideoPlayerAdapter";
import { myServiceConfig } from "./serviceConfigs";

console.log("running my-service content script");

const adapter = new VideoPlayerAdapter(myServiceConfig);
adapter.initialize();
```

### Step 3: Update manifest.json

Add the content script:

```json
{
  "content_scripts": [
    {
      "matches": ["https://myservice.com/*"],
      "js": ["content/myservice_content.js"]
    }
  ]
}
```

### Step 4: Update config.js

Add subtitle offset (if needed):

```javascript
export const moveSubtitlesUpBy = {
  "my-service": -6,
  // ... other services
};
```

## Customization Hooks

### Override processMutation()

If the service has unique mutation patterns:

```javascript
export const customConfig = {
  // ... other config
  processMutation(adapter, mutation) {
    // Custom mutation handling
  }
};
```

Override in adapter subclass:

```javascript
class CustomAdapter extends VideoPlayerAdapter {
  processMutation(mutation) {
    // Custom logic
  }
}
```

### Override getControlBar()

If control bar detection is non-standard:

```javascript
export const customConfig = {
  getControlBar(adapter) {
    // Custom control bar finder logic
    return document.querySelector(".my-custom-controls");
  }
};
```

### Custom Initialization

For platform-specific setup:

```javascript
export const customConfig = {
  onAdapterInitialize(adapter) {
    // Hide custom UI elements
    document.getElementById("ads").style.display = "none";
    // Setup custom styles
    addRule(".custom-style", { ... });
  }
};
```

## Testing a New Service

1. **Identify selectors** - Use browser DevTools to find:
   - Video element selector
   - Original subtitle container
   - Control bar element
   - Active/inactive UI state indicators

2. **Create minimal config** - Start with just required properties

3. **Test in isolation** - Run content script and verify:
   - Wrapper appears in DOM
   - Observers fire correctly
   - Messages are received
   - Cues are added to video

4. **Debug** - Check browser console for errors:
   - `document.querySelector()` returns correct elements
   - CSS selectors are specific enough
   - No conflicts with page styles

## Benefits

✅ **90% code reduction** - From 130-180 lines per service to ~10 lines
✅ **Single source of truth** - Core logic in one place
✅ **Easy to extend** - Add new services with just a config object
✅ **Maintainable** - Bug fixes apply to all services automatically
✅ **Testable** - Core adapter can be tested independently
✅ **Flexible** - Hooks allow customization without breaking base design
✅ **Scalable** - Add dozens of services with minimal effort

## Migration Path

1. **Phase 1**: Keep existing scripts, add new refactored versions alongside
   - `telequebec_content_refactored.js` + original
2. **Phase 2**: Test refactored versions in staging
3. **Phase 3**: Replace original scripts with refactored versions
4. **Phase 4**: Delete old scripts

This allows gradual migration with zero risk to production.
