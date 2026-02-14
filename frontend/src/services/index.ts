/**
 * Services Index
 * Central export point for all services
 */

// Unified API Client
export { api, APIClient } from "./api";

// Individual Services (for direct import if needed)
export { AudioEngineService } from "./audio-engine";
export { SampleService } from "./samples";
export { AudioInputService } from "./audio-input";
export { windowManager } from "./window-manager";
export { AudioEngine } from "./web-audio";

// Base API Client
export { BaseAPIClient, APIError } from "./api/base";

