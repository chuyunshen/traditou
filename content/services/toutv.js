/**
 * Refactored Tou.tv content script
 * Before: 160+ lines of duplicated code
 * After: 10 lines of service setup
 */

import { VideoPlayerAdapter } from "../core/VideoPlayerAdapter";
import { toutvConfig } from "../core/serviceConfigs";

console.log("running toutv content script");

const adapter = new VideoPlayerAdapter(toutvConfig);
adapter.initialize();
