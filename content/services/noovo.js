/**
 * Refactored Noovo content script
 * Before: 160+ lines of duplicated code
 * After: 10 lines of service setup
 */

import { VideoPlayerAdapter } from "../core/VideoPlayerAdapter";
import { noovoConfig } from "../core/serviceConfigs";

console.log("running noovo content script");

const adapter = new VideoPlayerAdapter(noovoConfig);
adapter.initialize();
