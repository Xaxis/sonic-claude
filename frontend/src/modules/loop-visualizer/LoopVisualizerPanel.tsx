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

import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { useEffect, useRef, useState, useMemo } from "react";
import { useSpectrum, useWaveform } from "@/contexts/TelemetryContext";
import { Activity, Waves, BarChart3, AlertTriangle } from "lucide-react";
import { WaveformDisplay } from "../sequencer/components/Shared/WaveformDisplay.tsx";

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
    const spectrum = useSpectrum();
    const waveform = useWaveform();
    const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
    const [stats, setStats] = useState<AudioStats>({
        peakFrequency: 0,
        peakLeft: 0,
        peakRight: 0,
        rmsLeft: 0,
        rmsRight: 0,
        spectralCentroid: 0,
        isClipping: false,
    });

    // Calculate audio statistics from spectrum and waveform data
    useMemo(() => {
        if (spectrum.length === 0 || waveform.left.length === 0) return;

        let maxMagnitude = 0;
        let maxIndex = 0;
        spectrum.forEach((mag, idx) => {
            if (mag > maxMagnitude) {
                maxMagnitude = mag;
                maxIndex = idx;
            }
        });
        const peakFreq = (maxIndex / spectrum.length) * 24000;

        let weightedSum = 0;
        let magnitudeSum = 0;
        spectrum.forEach((mag, idx) => {
            const freq = (idx / spectrum.length) * 24000;
            weightedSum += freq * mag;
            magnitudeSum += mag;
        });
        const centroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;

        const peakL = Math.max(...waveform.left.map(Math.abs));
        const peakR = Math.max(...waveform.right.map(Math.abs));
        const rmsL = Math.sqrt(
            waveform.left.reduce((sum, val) => sum + val * val, 0) / waveform.left.length
        );
        const rmsR = Math.sqrt(
            waveform.right.reduce((sum, val) => sum + val * val, 0) / waveform.right.length
        );

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

    // Draw spectrum visualization
    useEffect(() => {
        const canvas = spectrumCanvasRef.current;
        if (!canvas || spectrum.length === 0) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        const width = rect.width;
        const height = rect.height;
        const barWidth = width / spectrum.length;

        ctx.fillStyle = THEME_COLORS.background;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = THEME_COLORS.border;
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, THEME_COLORS.primary);
        gradient.addColorStop(0.5, THEME_COLORS.secondary);
        gradient.addColorStop(1, THEME_COLORS.accent);

        spectrum.forEach((valueDb, index) => {
            const normalized = Math.max(0, Math.min(1, (valueDb + 96) / 96));
            const barHeight = normalized * height;
            const x = index * barWidth;
            const y = height - barHeight;

            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
        });
    }, [spectrum]);



    return (
        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden p-2">
            <SubPanel title="WAVEFORM" className="flex-1" collapsible>
                <div className="relative h-full w-full">
                    <WaveformDisplay
                        data={waveform.left}
                        rightData={waveform.right}
                        color={THEME_COLORS.primary}
                        rightColor={THEME_COLORS.secondary}
                        backgroundColor={THEME_COLORS.background}
                        gridColor={THEME_COLORS.border}
                        showGrid={true}
                        glowEffect={true}
                        className="h-full w-full"
                    />
                    <div className="absolute left-2 top-2 flex items-center gap-2">
                        <Waves className="h-3 w-3 text-primary" />
                        <Label className="text-xs text-primary">L</Label>
                    </div>
                    <div className="absolute bottom-2 left-2 flex items-center gap-2">
                        <Waves className="h-3 w-3 text-secondary" />
                        <Label className="text-xs text-secondary">R</Label>
                    </div>
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

            <SubPanel title="SPECTRUM" className="flex-1" collapsible>
                <div className="relative h-full w-full">
                    <canvas ref={spectrumCanvasRef} className="h-full w-full" />
                    <div className="absolute left-2 top-2 flex items-center gap-2">
                        <BarChart3 className="h-3 w-3 text-accent" />
                        <Label className="text-xs text-muted-foreground">FFT</Label>
                    </div>
                </div>
            </SubPanel>

            <SubPanel
                title="LOOP FEEDBACK"
                collapsible
                headerActions={
                    <Activity className="h-3 w-3 text-primary" />
                }
            >
                <div className="space-y-2 p-2">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Peak Freq</Label>
                            <Badge variant="default" className="w-full justify-center">
                                {stats.peakFrequency.toFixed(1)} Hz
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Brightness</Label>
                            <Badge variant="secondary" className="w-full justify-center">
                                {stats.spectralCentroid.toFixed(0)} Hz
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Samples</Label>
                            <Badge variant="outline" className="w-full justify-center">
                                {waveform.left.length}
                            </Badge>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
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
            </SubPanel>
        </div>
    );
}
