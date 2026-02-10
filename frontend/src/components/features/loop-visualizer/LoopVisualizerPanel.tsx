/**
 * Loop Visualizer Panel
 *
 * Real-time visualization of what's flowing through the LOOP:
 * - Waveform (stereo) with peak detection
 * - Spectrum (frequency analysis) with dominant frequency
 * - Real-time audio statistics
 *
 * This is the HEART of the feedback loop system.
 */

import { SubPanel } from "@/components/ui/sub-panel";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState, useMemo } from "react";
import { useAudioEngine } from "@/contexts/AudioEngineContext";
import { Activity, Waves, BarChart3, AlertTriangle, Play, Square } from "lucide-react";

// Theme colors from globals.css
const THEME_COLORS = {
    primary: "hsl(187 85% 55%)", // Cyan - left channel
    secondary: "hsl(280 85% 65%)", // Magenta - right channel
    accent: "hsl(45 95% 60%)", // Yellow - highlights
    destructive: "hsl(0 85% 60%)", // Red - clipping
    background: "hsl(220 15% 6%)",
    border: "hsl(220 15% 15%)",
};

interface AudioStats {
    peakFrequency: number;
    peakLeft: number;
    peakRight: number;
    rmsLeft: number;
    rmsRight: number;
    spectralCentroid: number;
    isClipping: boolean;
}

export function LoopVisualizerPanel() {
    const { spectrum, waveform } = useAudioEngine();
    const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
    const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
    const [testSynthId, setTestSynthId] = useState<number | null>(null);
    const [stats, setStats] = useState<AudioStats>({
        peakFrequency: 0,
        peakLeft: 0,
        peakRight: 0,
        rmsLeft: 0,
        rmsRight: 0,
        spectralCentroid: 0,
        isClipping: false,
    });

    // Test tone functions
    const playTestTone = async () => {
        try {
            const response = await fetch("http://localhost:8000/audio-engine/audio/synthesis/synths", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    synthdef: "sine",
                    parameters: { freq: 440, amp: 0.3 },
                    group: 1,
                }),
            });
            const data = await response.json();
            setTestSynthId(data.id);
            console.log("🎵 Test tone started (440 Hz sine wave)");
        } catch (error) {
            console.error("Failed to start test tone:", error);
        }
    };

    const stopTestTone = async () => {
        if (testSynthId === null) return;
        try {
            await fetch(`http://localhost:8000/audio-engine/audio/synthesis/synths/${testSynthId}`, {
                method: "DELETE",
            });
            setTestSynthId(null);
            console.log("🛑 Test tone stopped");
        } catch (error) {
            console.error("Failed to stop test tone:", error);
        }
    };

    // Calculate audio statistics
    useMemo(() => {
        if (spectrum.length === 0 || waveform.left.length === 0) return;

        // Find peak frequency (dominant frequency in spectrum)
        let maxMagnitude = 0;
        let maxIndex = 0;
        spectrum.forEach((mag, idx) => {
            if (mag > maxMagnitude) {
                maxMagnitude = mag;
                maxIndex = idx;
            }
        });
        const peakFreq = (maxIndex / spectrum.length) * 24000; // Assuming 48kHz sample rate

        // Calculate spectral centroid (brightness)
        let weightedSum = 0;
        let magnitudeSum = 0;
        spectrum.forEach((mag, idx) => {
            const freq = (idx / spectrum.length) * 24000;
            weightedSum += freq * mag;
            magnitudeSum += mag;
        });
        const centroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;

        // Calculate peak and RMS for left/right channels
        const peakL = Math.max(...waveform.left.map(Math.abs));
        const peakR = Math.max(...waveform.right.map(Math.abs));
        const rmsL = Math.sqrt(
            waveform.left.reduce((sum, val) => sum + val * val, 0) / waveform.left.length
        );
        const rmsR = Math.sqrt(
            waveform.right.reduce((sum, val) => sum + val * val, 0) / waveform.right.length
        );

        // Check for clipping (> 0.95)
        const clipping = peakL > 0.95 || peakR > 0.95;

        setStats({
            peakFrequency: peakFreq,
            peakLeft: peakL,
            peakRight: peakR,
            rmsLeft: rmsL,
            rmsRight: rmsR,
            spectralCentroid: centroid,
            isClipping: clipping,
        });
    }, [spectrum, waveform]);

    // Draw spectrum with theme colors
    useEffect(() => {
        const canvas = spectrumCanvasRef.current;
        if (!canvas || spectrum.length === 0) return;

        // Debug: Log spectrum values once
        if (!window._spectrumLogged) {
            console.log("🎨 Drawing spectrum:", {
                length: spectrum.length,
                min: Math.min(...spectrum),
                max: Math.max(...spectrum),
                sample: spectrum.slice(0, 10)
            });
            window._spectrumLogged = true;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Make canvas responsive
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        const width = rect.width;
        const height = rect.height;
        const barWidth = width / spectrum.length;

        // Clear with background color
        ctx.fillStyle = THEME_COLORS.background;
        ctx.fillRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = THEME_COLORS.border;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Create gradient: cyan → magenta → yellow
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, THEME_COLORS.primary); // Cyan at bottom
        gradient.addColorStop(0.5, THEME_COLORS.secondary); // Magenta in middle
        gradient.addColorStop(1, THEME_COLORS.accent); // Yellow at top

        // Draw spectrum bars
        // Convert dB values to visual height (dB range: -96 to 0)
        spectrum.forEach((valueDb, index) => {
            // Normalize dB to 0-1 range: -96 dB = 0, 0 dB = 1
            const normalized = Math.max(0, Math.min(1, (valueDb + 96) / 96));
            const barHeight = normalized * height;
            const x = index * barWidth;
            const y = height - barHeight;

            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
        });
    }, [spectrum]);

    // Draw waveform with theme colors
    useEffect(() => {
        const canvas = waveformCanvasRef.current;
        if (!canvas || waveform.left.length === 0) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Make canvas responsive
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        const width = rect.width;
        const height = rect.height;
        const midY = height / 2;

        // Clear with background color
        ctx.fillStyle = THEME_COLORS.background;
        ctx.fillRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = THEME_COLORS.border;
        ctx.lineWidth = 1;

        // Horizontal lines
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Vertical lines
        for (let i = 0; i <= 8; i++) {
            const x = (width / 8) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Draw left channel (top half) - Cyan with glow
        ctx.strokeStyle = THEME_COLORS.primary;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = THEME_COLORS.primary;
        ctx.beginPath();
        waveform.left.forEach((value, index) => {
            const x = (index / waveform.left.length) * width;
            const y = midY - value * midY * 0.8;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw right channel (bottom half) - Magenta with glow
        ctx.strokeStyle = THEME_COLORS.secondary;
        ctx.shadowColor = THEME_COLORS.secondary;
        ctx.beginPath();
        waveform.right.forEach((value, index) => {
            const x = (index / waveform.right.length) * width;
            const y = midY + value * midY * 0.8;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw center line
        ctx.strokeStyle = THEME_COLORS.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(width, midY);
        ctx.stroke();
    }, [waveform]);

    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            {/* Test Audio Button */}
            <div className="flex items-center justify-between gap-2 px-2">
                <Label className="text-xs text-muted-foreground">
                    Test SuperCollider Audio Monitoring
                </Label>
                {testSynthId === null ? (
                    <Button
                        size="sm"
                        variant="default"
                        onClick={playTestTone}
                        className="h-7 gap-1 text-xs"
                    >
                        <Play className="h-3 w-3" />
                        Play Test Tone
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={stopTestTone}
                        className="h-7 gap-1 text-xs"
                    >
                        <Square className="h-3 w-3" />
                        Stop Test Tone
                    </Button>
                )}
            </div>

            <Separator />

            {/* Waveform */}
            <SubPanel title="WAVEFORM" className="flex-1">
                <div className="relative h-full w-full">
                    <canvas ref={waveformCanvasRef} className="h-full w-full" />

                    {/* Channel labels */}
                    <div className="absolute left-2 top-2 flex items-center gap-2">
                        <Waves className="h-3 w-3 text-primary" />
                        <Label className="text-xs text-primary">L</Label>
                    </div>
                    <div className="absolute bottom-2 left-2 flex items-center gap-2">
                        <Waves className="h-3 w-3 text-secondary" />
                        <Label className="text-xs text-secondary">R</Label>
                    </div>

                    {/* Clipping indicator */}
                    {stats.isClipping && (
                        <div className="absolute right-2 top-2">
                            <Badge variant="destructive" className="animate-pulse">
                                <AlertTriangle className="h-3 w-3" />
                                CLIPPING
                            </Badge>
                        </div>
                    )}
                </div>
            </SubPanel>

            {/* Spectrum */}
            <SubPanel title="SPECTRUM" className="flex-1">
                <div className="relative h-full w-full">
                    <canvas ref={spectrumCanvasRef} className="h-full w-full" />

                    {/* Spectrum icon */}
                    <div className="absolute left-2 top-2 flex items-center gap-2">
                        <BarChart3 className="h-3 w-3 text-accent" />
                        <Label className="text-xs text-muted-foreground">FFT</Label>
                    </div>
                </div>
            </SubPanel>

            <Separator />

            {/* Real-time Audio Statistics */}
            <div className="space-y-2 p-2">
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <Label className="text-xs font-semibold">LOOP FEEDBACK</Label>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                    {/* Peak Frequency */}
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Peak Freq</Label>
                        <Badge variant="default" className="w-full justify-center">
                            {stats.peakFrequency.toFixed(1)} Hz
                        </Badge>
                    </div>

                    {/* Spectral Centroid */}
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Brightness</Label>
                        <Badge variant="secondary" className="w-full justify-center">
                            {stats.spectralCentroid.toFixed(0)} Hz
                        </Badge>
                    </div>

                    {/* Sample Count */}
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Samples</Label>
                        <Badge variant="outline" className="w-full justify-center">
                            {waveform.left.length}
                        </Badge>
                    </div>
                </div>

                <Separator />

                {/* Level Meters */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Left Channel */}
                    <div className="space-y-1">
                        <Label className="text-xs text-primary">Left Channel</Label>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Peak:</span>
                            <span className="font-mono">
                                {(20 * Math.log10(stats.peakLeft + 1e-10)).toFixed(1)} dB
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">RMS:</span>
                            <span className="font-mono">
                                {(20 * Math.log10(stats.rmsLeft + 1e-10)).toFixed(1)} dB
                            </span>
                        </div>
                    </div>

                    {/* Right Channel */}
                    <div className="space-y-1">
                        <Label className="text-xs text-secondary">Right Channel</Label>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Peak:</span>
                            <span className="font-mono">
                                {(20 * Math.log10(stats.peakRight + 1e-10)).toFixed(1)} dB
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">RMS:</span>
                            <span className="font-mono">
                                {(20 * Math.log10(stats.rmsRight + 1e-10)).toFixed(1)} dB
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
