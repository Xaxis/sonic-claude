/**
 * Waveform Panel
 *
 * Real-time stereo waveform visualization.
 * Displays left and right channel waveforms with smooth rendering.
 */

import { useEffect, useRef } from "react";
import { Panel } from "@/components/ui/panel";
import { SubPanel } from "@/components/ui/sub-panel";
import { useWaveformWebSocket } from "@/hooks/useWaveformWebsocket";

export function WaveformPanel() {
    const { waveform, isConnected } = useWaveformWebSocket();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Draw waveform on canvas
    useEffect(() => {
        if (!canvasRef.current || !waveform) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size to match display size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Clear canvas
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Draw grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;

        // Horizontal center line
        ctx.beginPath();
        ctx.moveTo(0, rect.height / 4);
        ctx.lineTo(rect.width, rect.height / 4);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, (rect.height * 3) / 4);
        ctx.lineTo(rect.width, (rect.height * 3) / 4);
        ctx.stroke();

        // Draw waveforms
        const drawWaveform = (
            samples: number[],
            yOffset: number,
            color: string
        ) => {
            if (samples.length === 0) return;

            const sliceWidth = rect.width / samples.length;
            const amplitude = rect.height / 4; // Quarter height for each channel

            // Create gradient
            const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
            gradient.addColorStop(0, color);
            gradient.addColorStop(0.5, "rgba(168, 85, 247, 0.8)"); // purple
            gradient.addColorStop(1, color);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.beginPath();

            let x = 0;
            for (let i = 0; i < samples.length; i++) {
                const y = yOffset + samples[i] * amplitude;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.stroke();
        };

        // Draw left channel (top half)
        drawWaveform(waveform.samples_left, rect.height / 4, "rgba(6, 182, 212, 0.8)"); // cyan

        // Draw right channel (bottom half)
        drawWaveform(waveform.samples_right, (rect.height * 3) / 4, "rgba(236, 72, 153, 0.8)"); // pink
    }, [waveform]);

    return (
        <Panel title="WAVEFORM" className="flex flex-col">
            <div className="flex-1 p-4 flex flex-col gap-4">
                {/* Connection status */}
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                        STEREO WAVEFORM
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                        <div
                            className={`h-2 w-2 rounded-full ${
                                isConnected ? "bg-green-500" : "bg-red-500"
                            }`}
                        />
                        <span className="text-muted-foreground">
                            {isConnected ? "Connected" : "Disconnected"}
                        </span>
                    </div>
                </div>

                {/* Waveform display */}
                <SubPanel title="LIVE WAVEFORM" className="flex-1">
                    <div className="relative w-full h-full min-h-[300px]">
                        <canvas
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full"
                        />

                        {/* Channel labels */}
                        <div className="absolute left-2 top-2 text-xs font-mono text-cyan-400 opacity-50">
                            L
                        </div>
                        <div className="absolute left-2 bottom-2 text-xs font-mono text-pink-400 opacity-50">
                            R
                        </div>
                    </div>
                </SubPanel>

                {/* Info */}
                {waveform && (
                    <div className="flex justify-between text-xs text-muted-foreground font-mono">
                        <span>Sample Rate: {waveform.sample_rate} Hz</span>
                        <span>Samples: {waveform.samples_left.length}</span>
                    </div>
                )}
            </div>
        </Panel>
    );
}

