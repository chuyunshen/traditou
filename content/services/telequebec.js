/**
 * Refactored Telequebec content script
 * Before: 130+ lines of duplicated code
 * After: 10 lines of service setup
 */

import { VideoPlayerAdapter } from "../core/VideoPlayerAdapter";
import { telequebecConfig } from "../core/serviceConfigs";

console.log("running telequebec content script");

const adapter = new VideoPlayerAdapter(telequebecConfig);
adapter.initialize();
