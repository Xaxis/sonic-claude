/**
 * WebSocket Sync Component
 * 
 * Wires WebSocket hooks to Zustand store for real-time audio engine state.
 * This component has no UI - it just syncs WebSocket data to the store.
 * 
 * Mount this at the app root to enable real-time state updates.
 */

import { useEffect } from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { useTransportWebSocket } from '@/hooks/useTransportWebsocket';
import { useMeterWebSocket } from '@/hooks/useMeterWebsocket';
import { useSpectrumWebSocket } from '@/hooks/useSpectrumWebsocket';
import { useWaveformWebSocket } from '@/hooks/useWaveformWebsocket';
import { useAnalyticsWebSocket } from '@/hooks/useAnalyticsWebsocket';

export function WebSocketSync() {
    // WebSocket hooks
    const { transport } = useTransportWebSocket();
    const { meters } = useMeterWebSocket();
    const { spectrum } = useSpectrumWebSocket();
    const { waveform } = useWaveformWebSocket();
    const { analytics } = useAnalyticsWebSocket();
    
    // Zustand store actions
    const setTransport = useDAWStore((state) => state.setTransport);
    const setMeters = useDAWStore((state) => state.setMeters);
    const setSpectrum = useDAWStore((state) => state.setSpectrum);
    const setWaveform = useDAWStore((state) => state.setWaveform);
    const setAnalytics = useDAWStore((state) => state.setAnalytics);
    
    // Sync transport data
    useEffect(() => {
        if (transport) {
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
    useEffect(() => {
        if (analytics) {
            setAnalytics(analytics);
        }
    }, [analytics, setAnalytics]);
    
    // No UI - just sync
    return null;
}

