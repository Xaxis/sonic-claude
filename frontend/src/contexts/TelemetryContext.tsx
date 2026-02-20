/**
 * TelemetryContext - Global context for real-time telemetry data (SOURCE OF TRUTH)
 *
 * This is the GLOBAL telemetry context that manages ALL real-time WebSocket data:
 * - Spectrum data (FFT analysis for visualizers)
 * - Waveform data (time-domain samples for oscilloscope)
 * - Meter data (peak/RMS levels for all tracks)
 * - Transport data (playback position, tempo, time signature)
 * - Analytics data (CPU, memory, active voices)
 *
 * WHY GLOBAL:
 * - Real-time data is consumed by multiple visualizers across the app
 * - WebSocket connections should be singleton (one connection per type)
 * - Multiple panels need access (loop visualizer, mixer meters, transport display)
 * - NO cross-window sync needed (real-time data is ephemeral, not persisted)
 *
 * ARCHITECTURE:
 * - Uses existing WebSocket hooks (useSpectrumWebSocket, etc.)
 * - Provides centralized access to all real-time telemetry data
 * - No BroadcastChannel (real-time data doesn't need cross-window sync)
 */

import {
    createContext,
    useContext,
    ReactNode,
} from "react";
import { useSpectrumWebSocket } from "@/hooks/useSpectrumWebsocket";
import { useWaveformWebSocket, type WaveformData } from "@/hooks/useWaveformWebsocket";
import { useMeterWebSocket, type TrackMeters } from "@/hooks/useMeterWebsocket";
import { useTransportWebSocket, type TransportData } from "@/hooks/useTransportWebsocket";
import { useAnalyticsWebSocket, type AnalyticsData } from "@/hooks/useAnalyticsWebsocket";

// ============================================================================
// STATE TYPES
// ============================================================================

interface TelemetryState {
    // Spectrum Data (FFT analysis)
    spectrum: number[];
    spectrumConnected: boolean;

    // Waveform Data (time-domain samples)
    waveform: WaveformData | null;
    waveformConnected: boolean;

    // Meter Data (peak/RMS levels per track)
    meters: TrackMeters;
    metersConnected: boolean;

    // Transport Data (playback state)
    transport: TransportData | null;
    transportConnected: boolean;

    // Analytics Data (system performance)
    analytics: AnalyticsData | null;
    analyticsConnected: boolean;
}

// ============================================================================
// CONTEXT VALUE TYPE
// ============================================================================

interface TelemetryContextValue extends TelemetryState {
    // Connection status (all connections)
    isFullyConnected: boolean;
}

const TelemetryContext = createContext<TelemetryContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function TelemetryProvider({ children }: { children: ReactNode }) {
    // Connect to all WebSocket endpoints
    const { spectrum, isConnected: spectrumConnected } = useSpectrumWebSocket();
    const { waveform, isConnected: waveformConnected } = useWaveformWebSocket();
    const { meters, isConnected: metersConnected } = useMeterWebSocket();
    const { transport, isConnected: transportConnected } = useTransportWebSocket();
    const { analytics, isConnected: analyticsConnected } = useAnalyticsWebSocket();

    // Check if all connections are active
    const isFullyConnected =
        spectrumConnected &&
        waveformConnected &&
        metersConnected &&
        transportConnected &&
        analyticsConnected;

    const value: TelemetryContextValue = {
        // Spectrum
        spectrum,
        spectrumConnected,

        // Waveform
        waveform,
        waveformConnected,

        // Meters
        meters,
        metersConnected,

        // Transport
        transport,
        transportConnected,

        // Analytics
        analytics,
        analyticsConnected,

        // Overall status
        isFullyConnected,
    };

    return (
        <TelemetryContext.Provider value={value}>
            {children}
        </TelemetryContext.Provider>
    );
}

// ============================================================================
// HOOKS
// ============================================================================

export function useTelemetry() {
    const context = useContext(TelemetryContext);
    if (context === undefined) {
        throw new Error("useTelemetry must be used within a TelemetryProvider");
    }
    return context;
}

// Convenience hooks for specific data types
export function useSpectrum() {
    const { spectrum, spectrumConnected } = useTelemetry();
    return { spectrum, isConnected: spectrumConnected };
}

export function useWaveform() {
    const { waveform, waveformConnected } = useTelemetry();
    return { waveform, isConnected: waveformConnected };
}

export function useMeters() {
    const { meters, metersConnected } = useTelemetry();
    return { meters, isConnected: metersConnected };
}

export function useTransport() {
    const { transport, transportConnected } = useTelemetry();
    return { transport, isConnected: transportConnected };
}

export function useAnalytics() {
    const { analytics, analyticsConnected } = useTelemetry();
    return { analytics, isConnected: analyticsConnected };
}

