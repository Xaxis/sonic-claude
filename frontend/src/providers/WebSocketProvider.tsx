/**
 * WebSocket Sync Component
 * 
 * Wires WebSocket hooks to Zustand store for real-time audio engine state.
 * This component has no UI - it just syncs WebSocket data to the store.
 * 
 * Mount this at the app root to enable real-time state updates.
 */

import { useEffect } from 'react';
import { useDAWStore } from '@/stores/dawStore.ts';
import { useTransportWebSocket } from '@/hooks/useTransportWebsocket.ts';
import { useMeterWebSocket } from '@/hooks/useMeterWebsocket.ts';
import { useSpectrumWebSocket } from '@/hooks/useSpectrumWebsocket.ts';
import { useWaveformWebSocket } from '@/hooks/useWaveformWebsocket.ts';
// import { useAnalyticsWebSocket } from '@/hooks/useAnalyticsWebsocket'; // TODO: Implement backend endpoint

export function WebSocketProvider() {
    // WebSocket hooks
    const { transport } = useTransportWebSocket();
    const { meters } = useMeterWebSocket();
    const { spectrum } = useSpectrumWebSocket();
    const { waveform } = useWaveformWebSocket();
    // const { analytics } = useAnalyticsWebSocket(); // TODO: Implement backend endpoint

    // Zustand store actions
    const setTransport = useDAWStore((state) => state.setTransport);
    const setMeters = useDAWStore((state) => state.setMeters);
    const setSpectrum = useDAWStore((state) => state.setSpectrum);
    const setWaveform = useDAWStore((state) => state.setWaveform);
    // const setAnalytics = useDAWStore((state) => state.setAnalytics); // TODO: Implement backend endpoint
    
    // Sync transport data
    useEffect(() => {
        if (transport) {
            // Debug: Log active notes when transport updates (only when notes are active)
            if (transport.active_notes && transport.active_notes.length > 0) {
                console.log('📡 WebSocket transport update - active_notes:', transport.active_notes);
            }
            setTransport(transport);
        }
    }, [transport, setTransport]);
    
    // Sync meter data
    useEffect(() => {
        if (meters && Object.keys(meters).length > 0) {
            setMeters(meters);
        }
    }, [meters, setMeters]);
    
    // Sync spectrum data
    useEffect(() => {
        if (spectrum && spectrum.length > 0) {
            setSpectrum(spectrum);
        }
    }, [spectrum, setSpectrum]);
    
    // Sync waveform data
    useEffect(() => {
        if (waveform) {
            setWaveform(waveform);
        }
    }, [waveform, setWaveform]);

    // Sync analytics data
    // TODO: Implement backend endpoint
    // useEffect(() => {
    //     if (analytics) {
    //         setAnalytics(analytics);
    //     }
    // }, [analytics, setAnalytics]);

    // No UI - just sync
    return null;
}

