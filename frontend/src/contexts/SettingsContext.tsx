/**
 * Settings Context
 * Global application settings and preferences
 * @TODO - This is broken bullshit and needs to be refactored/removed
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const SETTINGS_STORAGE_KEY = 'sonic-claude-settings';

export interface AudioSettings {
    sampleRate: number;
    bufferSize: number;
    inputDevice: string | null;
    outputDevice: string | null;
}

export interface MIDISettings {
    inputDevices: string[];
    outputDevices: string[];
    midiClock: "internal" | "external";
}

export interface DisplaySettings {
    theme: "dark" | "light";
    meterMode: "peak" | "rms" | "both";
    waveformStyle: "filled" | "outline" | "bars";
    spectrumStyle: "bars" | "line" | "filled";
    showGrid: boolean;
    snapToGrid: boolean;
}

export interface PerformanceSettings {
    cpuLimit: number; // 0-100%
    diskCacheSize: number; // MB
    autoSaveInterval: number; // seconds, 0 = disabled
}

export interface Settings {
    audio: AudioSettings;
    midi: MIDISettings;
    display: DisplaySettings;
    performance: PerformanceSettings;
}

interface SettingsContextValue {
    settings: Settings;
    updateAudioSettings: (settings: Partial<AudioSettings>) => void;
    updateMIDISettings: (settings: Partial<MIDISettings>) => void;
    updateDisplaySettings: (settings: Partial<DisplaySettings>) => void;
    updatePerformanceSettings: (settings: Partial<PerformanceSettings>) => void;
    resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: Settings = {
    audio: {
        sampleRate: 44100,
        bufferSize: 512,
        inputDevice: null,
        outputDevice: null,
    },
    midi: {
        inputDevices: [],
        outputDevices: [],
        midiClock: "internal",
    },
    display: {
        theme: "dark",
        meterMode: "both",
        waveformStyle: "filled",
        spectrumStyle: "bars",
        showGrid: true,
        snapToGrid: true,
    },
    performance: {
        cpuLimit: 80,
        diskCacheSize: 1024,
        autoSaveInterval: 300, // 5 minutes
    },
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(() => {
        // Load from localStorage
        const storedStr = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (storedStr) {
            try {
                const stored = JSON.parse(storedStr);
                return { ...DEFAULT_SETTINGS, ...stored };
            } catch (error) {
                console.error("Failed to parse stored settings:", error);
            }
        }
        return DEFAULT_SETTINGS;
    });

    // Save to localStorage whenever settings change
    useEffect(() => {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    const updateAudioSettings = useCallback((updates: Partial<AudioSettings>) => {
        setSettings((prev) => ({
            ...prev,
            audio: { ...prev.audio, ...updates },
        }));
    }, []);

    const updateMIDISettings = useCallback((updates: Partial<MIDISettings>) => {
        setSettings((prev) => ({
            ...prev,
            midi: { ...prev.midi, ...updates },
        }));
    }, []);

    const updateDisplaySettings = useCallback((updates: Partial<DisplaySettings>) => {
        setSettings((prev) => ({
            ...prev,
            display: { ...prev.display, ...updates },
        }));
    }, []);

    const updatePerformanceSettings = useCallback((updates: Partial<PerformanceSettings>) => {
        setSettings((prev) => ({
            ...prev,
            performance: { ...prev.performance, ...updates },
        }));
    }, []);

    const resetToDefaults = useCallback(() => {
        setSettings(DEFAULT_SETTINGS);
    }, []);

    const value: SettingsContextValue = {
        settings,
        updateAudioSettings,
        updateMIDISettings,
        updateDisplaySettings,
        updatePerformanceSettings,
        resetToDefaults,
    };

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
