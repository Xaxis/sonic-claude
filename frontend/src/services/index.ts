/**
 * Services Index
 * Central export point for all services
 */

// === API CLIENT (Primary way to interact with backend) ===
export { api, APIClient } from "./api";
export { BaseAPIClient, APIError } from "./api/base";

// === SERVICES (Business Logic Layer) ===
export { windowManager } from "./window-manager";
export { statePersistence } from "./state-persistence";

// === BROWSER API WRAPPERS ===
export { AudioEngine } from "./web-audio";

// === TYPES ===
export type { SessionState, SequencerUIState } from "./state-persistence";
export type { StateUpdate } from "./window-manager";

