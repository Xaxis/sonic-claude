/**
 * useAudioInput Hook
 * 
 * Manages audio input device selection, monitoring, recording, and spectrum analysis.
 * Handles both Web Audio API (browser) and SuperCollider (backend) integration.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/services/api";
import { toast } from "sonner";

export interface AudioDeviceInfo {
    deviceId: string;
    label: string;
    kind: string;
}

interface UseAudioInputProps {
    onRecordingComplete?: (file: File, duration: number) => Promise<void>;
}

export function useAudioInput({ onRecordingComplete }: UseAudioInputProps = {}) {
    // Device state
    const [audioInputDevices, setAudioInputDevices] = useState<AudioDeviceInfo[]>([]);
    const [selectedInputDevice, setSelectedInputDevice] = useState<string>("");
    
    // Monitoring state
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [inputLevel, setInputLevel] = useState(0);
    const [gain, setGain] = useState(0); // dB
    const [spectrumData, setSpectrumData] = useState<number[]>(new Array(32).fill(0));
    
    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    
    // Web Audio API refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    
    // Recording refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const recordingStartTimeRef = useRef<number>(0);

    // Refs to track latest values without causing re-renders
    const audioInputDevicesRef = useRef<AudioDeviceInfo[]>([]);
    const gainRef = useRef<number>(0);
    const isInitialMountRef = useRef<boolean>(true);

    // Map device label to SuperCollider device index
    const getSupercolliderDeviceIndex = useCallback((deviceLabel: string): number => {
        if (deviceLabel.includes("BlackHole")) return 0;
        if (deviceLabel.includes("Microphone")) return 1;
        if (deviceLabel.includes("Speakers")) return 2;
        if (deviceLabel.includes("Multi-Output")) return 3;
        return 0; // Default to first device
    }, []);

    // Enumerate audio input devices
    useEffect(() => {
        const enumerateDevices = async () => {
            try {
                // Request permission to get device labels
                const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                
                // Enumerate with labels
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices
                    .filter((device) => device.kind === "audioinput")
                    .map((device) => ({
                        deviceId: device.deviceId,
                        label: device.label || `Audio Input ${device.deviceId.slice(0, 5)}`,
                        kind: device.kind,
                    }));
                
                // Stop temp stream
                tempStream.getTracks().forEach((track) => track.stop());

                setAudioInputDevices(audioInputs);
                audioInputDevicesRef.current = audioInputs; // Update ref

                if (audioInputs.length > 0 && !selectedInputDevice) {
                    setSelectedInputDevice(audioInputs[0].deviceId);
                }

                console.log("Audio input devices detected:", audioInputs);
            } catch (error) {
                console.error("Failed to enumerate audio devices:", error);
                toast.error("Failed to access audio devices. Grant microphone permission.");
            }
        };

        enumerateDevices();

        // Listen for device changes
        navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
        return () => {
            navigator.mediaDevices.removeEventListener("devicechange", enumerateDevices);
        };
    }, []); // Only run once on mount

    // Update input level and spectrum
    const updateInputLevel = useCallback(() => {
        if (!analyserRef.current) return;

        // Get time domain data for level meter
        const timeData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(timeData);

        // Calculate RMS level
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
            const normalized = (timeData[i] - 128) / 128;
            sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / timeData.length);
        const db = 20 * Math.log10(rms + 0.0001);

        setInputLevel(Math.max(-60, Math.min(0, db)));

        // Get frequency data for spectrum
        const freqData = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(freqData);

        // Downsample to 32 bars for mini spectrum
        const bars = 32;
        const barData: number[] = [];
        const samplesPerBar = Math.floor(freqData.length / bars);

        for (let i = 0; i < bars; i++) {
            let sum = 0;
            for (let j = 0; j < samplesPerBar; j++) {
                sum += freqData[i * samplesPerBar + j];
            }
            barData.push(sum / samplesPerBar / 255); // Normalize to 0-1
        }

        setSpectrumData(barData);

        animationFrameRef.current = requestAnimationFrame(updateInputLevel);
    }, []);

    // Start Web Audio API monitoring
    const startAudioInput = useCallback(async (deviceId: string) => {
        try {
            // Stop existing stream
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            }

            // Create audio context
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new AudioContext();
            }

            // Resume audio context if suspended (required by browsers)
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            // Get media stream with proper constraints
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: { exact: deviceId },
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });
            mediaStreamRef.current = stream;

            console.log("📡 Media stream acquired, tracks:", stream.getTracks().map(t => ({
                kind: t.kind,
                label: t.label,
                enabled: t.enabled,
                muted: t.muted,
                readyState: t.readyState,
                settings: t.getSettings()
            })));

            // Create analyser node
            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;
            analyserRef.current = analyser;

            // Create gain node
            const gainNode = audioContextRef.current.createGain();
            const gainLinear = Math.pow(10, gainRef.current / 20);
            gainNode.gain.value = gainLinear;
            gainNodeRef.current = gainNode;

            // Connect: source -> gain -> analyser (NO destination to avoid feedback)
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(gainNode);
            gainNode.connect(analyser);
            // Note: We don't connect to destination to avoid feedback loop

            // Start animation loop
            updateInputLevel();

            console.log("✅ Audio input started:", deviceId);
            console.log("   Audio context state:", audioContextRef.current.state);
            console.log("   Sample rate:", audioContextRef.current.sampleRate);
        } catch (error) {
            console.error("Failed to start audio input:", error);
            toast.error("Failed to start audio input");
        }
    }, [updateInputLevel]);

    // Stop Web Audio API monitoring
    const stopAudioInput = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        analyserRef.current = null;
        gainNodeRef.current = null;
        setInputLevel(0);
        setSpectrumData(new Array(32).fill(0));

        console.log("🛑 Audio input stopped");
    }, []);

    // Start SuperCollider input
    const startSupercolliderInput = useCallback(async (deviceId: string) => {
        try {
            const deviceLabel =
                audioInputDevicesRef.current.find((d) => d.deviceId === deviceId)?.label || "";
            const scDeviceIndex = getSupercolliderDeviceIndex(deviceLabel);
            const ampLinear = Math.pow(10, gainRef.current / 20); // Convert dB to linear

            await api.audioInput.setInputDevice(scDeviceIndex, ampLinear);
            console.log(`✅ SuperCollider input set to device ${scDeviceIndex} (${deviceLabel})`);
        } catch (error) {
            // Silently ignore - backend may not be ready yet
            console.warn("SuperCollider input not available:", error);
        }
    }, [getSupercolliderDeviceIndex]);

    // Stop SuperCollider input
    const stopSupercolliderInput = useCallback(async () => {
        try {
            await api.audioInput.stopInput();
            console.log("🛑 SuperCollider input stopped");
        } catch (error) {
            console.warn("Failed to stop SuperCollider input:", error);
        }
    }, []);

    // Handle gain change
    const handleGainChange = useCallback((newGain: number) => {
        setGain(newGain);
        gainRef.current = newGain; // Update ref

        // Update Web Audio API gain node
        if (gainNodeRef.current) {
            const gainLinear = Math.pow(10, newGain / 20);
            gainNodeRef.current.gain.value = gainLinear;
        }

        // Update SuperCollider gain
        if (isMonitoring && selectedInputDevice) {
            const ampLinear = Math.pow(10, newGain / 20);
            api.audioInput.setInputGain(ampLinear).catch((error) => {
                console.warn("Failed to update SuperCollider gain:", error);
            });
        }
    }, [isMonitoring, selectedInputDevice]);

    // Handle start/stop recording
    const handleStartRecording = useCallback(async () => {
        if (isRecording) {
            // Stop recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
            }
        } else {
            // Start recording
            try {
                // Ensure we have a media stream - create one if needed
                let stream = mediaStreamRef.current;
                if (!stream) {
                    // No stream yet - create one using selected device or default
                    const deviceId = selectedInputDevice || audioInputDevicesRef.current[0]?.deviceId;
                    if (!deviceId) {
                        toast.error("No audio input device available");
                        return;
                    }

                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: { deviceId: { exact: deviceId } },
                    });
                    mediaStreamRef.current = stream;
                    console.log("📡 Created media stream for recording");
                }

                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: "audio/webm;codecs=opus",
                });

                recordedChunksRef.current = [];
                recordingStartTimeRef.current = Date.now();

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        recordedChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
                    const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
                    const file = new File([blob], `recording-${Date.now()}.webm`, {
                        type: "audio/webm",
                    });

                    setIsRecording(false);

                    if (onRecordingComplete) {
                        await onRecordingComplete(file, duration);
                    }
                };

                mediaRecorder.start();
                mediaRecorderRef.current = mediaRecorder;
                setIsRecording(true);

                console.log("🔴 Recording started");
            } catch (error) {
                console.error("Failed to start recording:", error);
                toast.error("Failed to start recording");
            }
        }
    }, [isRecording, onRecordingComplete, selectedInputDevice]);

    // Effect: Start/stop audio monitoring when device or monitoring state changes
    useEffect(() => {
        if (isMonitoring && selectedInputDevice) {
            console.log("🎤 Starting monitoring for device:", selectedInputDevice);
            // Start audio input
            startAudioInput(selectedInputDevice);
            startSupercolliderInput(selectedInputDevice);

            // Cleanup: stop audio when unmounting or when monitoring/device changes
            return () => {
                console.log("🛑 Cleanup: stopping monitoring");
                stopAudioInput();
                stopSupercolliderInput();
            };
        } else if (!isMonitoring) {
            // Stop audio if monitoring is disabled
            console.log("🛑 Monitoring disabled, stopping audio");
            stopAudioInput();
            stopSupercolliderInput();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMonitoring, selectedInputDevice]);

    return {
        // State
        audioInputDevices,
        selectedInputDevice,
        isMonitoring,
        inputLevel,
        gain,
        spectrumData,
        isRecording,

        // Actions
        setSelectedInputDevice,
        setIsMonitoring,
        handleGainChange,
        handleStartRecording,
    };
}

