// https://github.com/GoogleChrome/lighthouse/blob/main/docs/configuration.md
// https://github.com/GoogleChrome/lighthouse/blob/main/core/config/default-config.js

// Default throttling for a mid-tier mobile device, lighthouse uses this in chrome extenstion
const DEFAULT_THROTTLING = {
  rttMs: 150,
  throughputKbps: 1638.4,
  requestLatencyMs: 562.5,
  downloadThroughputKbps: 1474.5600000000002,
  uploadThroughputKbps: 675,
  cpuSlowdownMultiplier: 4,
};

// Expected throttling for an iphone 14 on a 5G network
const MOBILE_MODERN_THROTTLING = {
  rttMs: 20,
  throughputKbps: 100000,
  requestLatencyMs: 30,
  downloadThroughputKbps: 95000,
  uploadThroughputKbps: 30000,
  cpuSlowdownMultiplier: 1,
};

export default {
  extends: "lighthouse:default",
  saveAssets: false,
  settings: {
    output: "json",
    saveAssets: false,
    throttlingMethod: "simulate",
    throttling: MOBILE_MODERN_THROTTLING,
    disableFullPageScreenshot: true,
    onlyCategories: ["performance", "seo", "accessibility", "best-practices"],
    skipAudits: [
      "screenshot-thumbnails",
      "final-screenshot",
      "full-page-screenshot",
      "color-contrast",
    ],
  },
};
