/**
 * Loop Visualizer Panel
 * 
 * Real-time visualization of what's flowing through the LOOP:
 * - Waveform (stereo)
 * - Spectrum (frequency analysis)
 * - Combined unified view
 * 
 * This is the HEART of the feedback loop system.
 */

import { SubPanel } from "@/components/ui/sub-panel";
import { useEffect, useRef } from "react";
import { useAudioEngine } from "@/contexts/AudioEngineContext";

export function LoopVisualizerPanel() {
    const { spectrum, waveform } = useAudioEngine();
    const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
    const waveformCanvasRef = useRef<HTMLCanvasElement>(null);

    // Draw spectrum
    useEffect(() => {
        const canvas = spectrumCanvasRef.current;
        if (!canvas || spectrum.length === 0) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const barWidth = width / spectrum.length;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        spectrum.forEach((value, index) => {
            const barHeight = (value / 255) * height;
            const x = index * barWidth;
            const y = height - barHeight;

            const hue = (index / spectrum.length) * 120;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.fillRect(x, y, barWidth - 1, barHeight);
        });
    }, [spectrum]);

    // Draw waveform
    useEffect(() => {
        const canvas = waveformCanvasRef.current;
        if (!canvas || waveform.left.length === 0) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const midY = height / 2;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);

        // Draw left channel (top half)
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 1;
        ctx.beginPath();
        waveform.left.forEach((value, index) => {
            const x = (index / waveform.left.length) * width;
            const y = midY - (value * midY * 0.8);
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw right channel (bottom half)
        ctx.strokeStyle = "#0088ff";
        ctx.beginPath();
        waveform.right.forEach((value, index) => {
            const x = (index / waveform.right.length) * width;
            const y = midY + (value * midY * 0.8);
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw center line
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(width, midY);
        ctx.stroke();
    }, [waveform]);

    return (
        <div className="flex-1 flex flex-col gap-2 p-2 overflow-hidden h-full">
                {/* Waveform */}
                <SubPanel title="Waveform" className="flex-1">
                    <canvas
                        ref={waveformCanvasRef}
                        width={800}
                        height={200}
                        className="w-full h-full"
                        style={{ imageRendering: "pixelated" }}
                    />
                </SubPanel>

                {/* Spectrum */}
                <SubPanel title="Spectrum" className="flex-1">
                    <canvas
                        ref={spectrumCanvasRef}
                        width={800}
                        height={200}
                        className="w-full h-full"
                        style={{ imageRendering: "pixelated" }}
                    />
                </SubPanel>

            {/* Loop Info */}
            <div className="text-xs text-muted-foreground text-center py-1 border-t border-border bg-muted/20">
                Click to decompose • Drag to extract • Right-click for options
            </div>
        </div>
    );
}

