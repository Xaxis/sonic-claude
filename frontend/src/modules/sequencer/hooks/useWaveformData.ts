/**
 * useWaveformData Hook
 * 
 * Loads and processes audio waveform data for sequencer clips.
 * Handles waveform tiling/looping when clip duration exceeds sample length.
 * 
 * Features:
 * - Fetches sample metadata to get duration
 * - Loads and decodes audio file
 * - Downsamples to specified resolution (200 for clips, 2000 for editor)
 * - Tiles waveform when clip is longer than sample (DAW-standard looping behavior)
 * - Supports both mono and stereo waveforms
 */

import { useState, useEffect } from "react";
import { api } from "@/services/api";

interface UseWaveformDataOptions {
    /** Sample ID to load */
    sampleId: string | null;
    /** Clip duration in beats */
    clipDuration: number;
    /** Tempo in BPM */
    tempo: number;
    /** Number of samples per loop iteration (200 for clips, 2000 for editor) */
    samplesPerLoop?: number;
}

interface WaveformDataResult {
    /** Left channel (or mono) waveform data */
    leftData: number[];
    /** Right channel waveform data (empty if mono) */
    rightData: number[];
    /** Loading state */
    isLoading: boolean;
    /** Error message if loading failed */
    error: string | null;
}

export function useWaveformData({
    sampleId,
    clipDuration,
    tempo,
    samplesPerLoop = 200,
}: UseWaveformDataOptions): WaveformDataResult {
    const [leftData, setLeftData] = useState<number[]>([]);
    const [rightData, setRightData] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!sampleId) {
            setLeftData([]);
            setRightData([]);
            setIsLoading(false);
            setError(null);
            return;
        }

        let cancelled = false;

        const loadWaveform = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Fetch sample metadata to get duration
                const sampleMetadata = await api.samples.getById(sampleId);
                const sampleDurationSeconds = sampleMetadata.duration;

                // Fetch audio file
                const url = `http://localhost:8000/api/samples/${sampleId}/download`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`Failed to fetch audio file: ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();

                // Decode audio
                const audioContext = new AudioContext();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                await audioContext.close();

                if (cancelled) return;

                // Calculate clip duration in seconds
                const clipDurationSeconds = (clipDuration / tempo) * 60;

                // Calculate how many times the sample loops in the clip
                // Clamp to reasonable range to avoid memory issues
                const rawLoopCount = clipDurationSeconds / sampleDurationSeconds;
                const loopCount = Math.max(1, Math.min(100, Math.ceil(rawLoopCount)));

                // Extract and downsample left channel (or mono)
                const leftChannelData = audioBuffer.getChannelData(0);

                // If clip is shorter than sample, downsample only the portion we need
                let singleLoopLeft: number[] = [];
                if (rawLoopCount < 1) {
                    // Clip is shorter than sample - only extract the portion we need
                    const samplesNeeded = Math.floor(samplesPerLoop * rawLoopCount);
                    const blockSize = Math.floor(leftChannelData.length / samplesPerLoop);

                    for (let i = 0; i < samplesNeeded; i++) {
                        const start = i * blockSize;
                        const end = start + blockSize;
                        let max = 0;

                        for (let j = start; j < end; j++) {
                            const abs = Math.abs(leftChannelData[j]);
                            if (abs > max) max = abs;
                        }

                        singleLoopLeft.push(max);
                    }
                } else {
                    // Clip is longer than or equal to sample - extract full sample
                    const blockSize = Math.floor(leftChannelData.length / samplesPerLoop);

                    for (let i = 0; i < samplesPerLoop; i++) {
                        const start = i * blockSize;
                        const end = start + blockSize;
                        let max = 0;

                        for (let j = start; j < end; j++) {
                            const abs = Math.abs(leftChannelData[j]);
                            if (abs > max) max = abs;
                        }

                        singleLoopLeft.push(max);
                    }
                }

                // Tile the waveform to match clip duration (only if clip is longer than sample)
                const tiledLeft: number[] = [];
                if (rawLoopCount < 1) {
                    // Clip is shorter - use the trimmed waveform
                    tiledLeft.push(...singleLoopLeft);
                } else {
                    // Clip is longer - tile the waveform
                    for (let i = 0; i < loopCount; i++) {
                        tiledLeft.push(...singleLoopLeft);
                    }
                }

                // Extract right channel if stereo
                let tiledRight: number[] = [];
                if (audioBuffer.numberOfChannels > 1) {
                    const rightChannelData = audioBuffer.getChannelData(1);
                    let singleLoopRight: number[] = [];

                    if (rawLoopCount < 1) {
                        // Clip is shorter than sample - only extract the portion we need
                        const samplesNeeded = Math.floor(samplesPerLoop * rawLoopCount);
                        const blockSize = Math.floor(rightChannelData.length / samplesPerLoop);

                        for (let i = 0; i < samplesNeeded; i++) {
                            const start = i * blockSize;
                            const end = start + blockSize;
                            let max = 0;

                            for (let j = start; j < end; j++) {
                                const abs = Math.abs(rightChannelData[j]);
                                if (abs > max) max = abs;
                            }

                            singleLoopRight.push(max);
                        }
                    } else {
                        // Clip is longer than or equal to sample - extract full sample
                        const blockSize = Math.floor(rightChannelData.length / samplesPerLoop);

                        for (let i = 0; i < samplesPerLoop; i++) {
                            const start = i * blockSize;
                            const end = start + blockSize;
                            let max = 0;

                            for (let j = start; j < end; j++) {
                                const abs = Math.abs(rightChannelData[j]);
                                if (abs > max) max = abs;
                            }

                            singleLoopRight.push(max);
                        }
                    }

                    // Tile right channel (only if clip is longer than sample)
                    if (rawLoopCount < 1) {
                        // Clip is shorter - use the trimmed waveform
                        tiledRight.push(...singleLoopRight);
                    } else {
                        // Clip is longer - tile the waveform
                        for (let i = 0; i < loopCount; i++) {
                            tiledRight.push(...singleLoopRight);
                        }
                    }
                }

                if (!cancelled) {
                    setLeftData(tiledLeft);
                    setRightData(tiledRight);
                    setIsLoading(false);
                }
            } catch (err) {
                if (!cancelled) {
                    const errorMessage = err instanceof Error ? err.message : "Failed to load waveform";
                    console.error("Failed to load waveform:", err);
                    setError(errorMessage);
                    setLeftData([]);
                    setRightData([]);
                    setIsLoading(false);
                }
            }
        };

        loadWaveform();

        return () => {
            cancelled = true;
        };
    }, [sampleId, clipDuration, tempo, samplesPerLoop]);

    return { leftData, rightData, isLoading, error };
}

