/**
 * Spectrum Panel
 *
 * Real-time spectrum analyzer visualization.
 * Shows frequency content and spectral features.
 */

import { useEffect, useRef } from "react";
import { Panel } from "@/components/ui/panel";
import { useAudioEngine } from "@/contexts/AudioEngineContext";

export function SpectrumPanel() {
    const { spectrum } = useAudioEngine();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || spectrum.length === 0) return;

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

        // Draw spectrum bars
        const barWidth = rect.width / spectrum.length;
        const gradient = ctx.createLinearGradient(0, rect.height, 0, 0);
        gradient.addColorStop(0, "rgba(6, 182, 212, 0.8)"); // cyan-500
        gradient.addColorStop(0.5, "rgba(168, 85, 247, 0.8)"); // purple-500
        gradient.addColorStop(1, "rgba(236, 72, 153, 0.8)"); // pink-500

        spectrum.forEach((magnitude, i) => {
            const x = i * barWidth;
            // Normalize magnitude from dB (-96 to 0) to height (0 to 1)
            const normalizedHeight = Math.max(0, (magnitude + 96) / 96);
            const barHeight = normalizedHeight * rect.height;

            ctx.fillStyle = gradient;
            ctx.fillRect(x, rect.height - barHeight, barWidth - 1, barHeight);
        });

        // Draw grid lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (i / 4) * rect.height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(rect.width, y);
            ctx.stroke();
        }
    }, [spectrum]);

    return (
        <Panel title="SPECTRUM" className="flex flex-col">
            <div className="flex flex-1 flex-col gap-2 p-4">
                {/* Connection status */}
                <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{spectrum.length} bins</span>
                    <div className="flex items-center gap-2">
                        <div
                            className={`h-2 w-2 rounded-full ${
                                spectrum.length > 0 ? "bg-green-500" : "bg-red-500"
                            }`}
                        />
                        <span className="text-muted-foreground">
                            {spectrum.length > 0 ? "Connected" : "Disconnected"}
                        </span>
                    </div>
                </div>

                {/* Spectrum canvas */}
                <canvas
                    ref={canvasRef}
                    className="w-full flex-1 rounded border border-white/10"
                    style={{ minHeight: "200px" }}
                />

                {/* Frequency labels */}
                <div className="text-muted-foreground flex justify-between text-xs">
                    <span>20 Hz</span>
                    <span>1 kHz</span>
                    <span>10 kHz</span>
                    <span>20 kHz</span>
                </div>
            </div>
        </Panel>
    );
}
