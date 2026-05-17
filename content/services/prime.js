/**
 * Refactored Prime Video content script
 * Before: 180+ lines of duplicated code
 * After: 10 lines of service setup
 */

import { VideoPlayerAdapter } from "../core/VideoPlayerAdapter";
import { primeConfig } from "../core/serviceConfigs";

console.log("running prime video content script");

const adapter = new VideoPlayerAdapter(primeConfig);
adapter.initialize();
