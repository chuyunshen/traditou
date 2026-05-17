/**
 * Refactored TV5 Unis content script
 * Before: 140+ lines of duplicated code
 * After: 10 lines of service setup
 */

import { VideoPlayerAdapter } from "../core/VideoPlayerAdapter";
import { tv5Config } from "../core/serviceConfigs";

console.log("running tv5 content script");

const adapter = new VideoPlayerAdapter(tv5Config);
adapter.initialize();
