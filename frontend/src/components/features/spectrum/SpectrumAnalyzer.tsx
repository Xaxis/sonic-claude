import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Wifi, WifiOff } from "lucide-react";

interface SpectrumAnalyzerProps {
    spectrum: number[];
    isConnected?: boolean;
}

export function SpectrumAnalyzer({ spectrum, isConnected = false }: SpectrumAnalyzerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Set canvas size to match container
        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        const draw = () => {
            const width = canvas.width / window.devicePixelRatio;
            const height = canvas.height / window.devicePixelRatio;

            // Clear canvas
            ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            ctx.fillRect(0, 0, width, height);

            if (spectrum.length === 0 || spectrum.every((v) => v === 0)) {
                // Draw placeholder text
                ctx.fillStyle = "rgba(0, 245, 255, 0.5)";
                ctx.font = "bold 16px monospace";
                ctx.textAlign = "center";
                ctx.fillText("WAITING FOR AUDIO...", width / 2, height / 2);
                animationFrameRef.current = requestAnimationFrame(draw);
                return;
            }

            // Draw spectrum bars
            const barCount = spectrum.length;
            const barWidth = width / barCount;
            const barGap = 1;

            spectrum.forEach((value, i) => {
                // Amplify the values for better visibility
                const amplifiedValue = Math.min(1.0, value * 2.5);
                const barHeight = amplifiedValue * height * 0.95;
                const x = i * barWidth;
                const y = height - barHeight;

                // Color gradient based on frequency
                // Low frequencies (bass) = cyan
                // Mid frequencies = magenta
                // High frequencies = yellow
                let color;
                let glowColor;
                if (i < barCount * 0.33) {
                    // Low frequencies - bright cyan
                    const intensity = Math.floor(amplifiedValue * 255);
                    color = `rgb(0, ${intensity + 100}, ${intensity + 100})`;
                    glowColor = `rgba(0, 255, 255, ${amplifiedValue})`;
                } else if (i < barCount * 0.66) {
                    // Mid frequencies - bright magenta
                    const intensity = Math.floor(amplifiedValue * 255);
                    color = `rgb(${intensity + 100}, 0, ${intensity + 100})`;
                    glowColor = `rgba(255, 0, 255, ${amplifiedValue})`;
                } else {
                    // High frequencies - bright yellow
                    const intensity = Math.floor(amplifiedValue * 255);
                    color = `rgb(${intensity + 100}, ${intensity + 100}, 0)`;
                    glowColor = `rgba(255, 255, 0, ${amplifiedValue})`;
                }

                // Draw bar with glow
                ctx.shadowBlur = 15;
                ctx.shadowColor = glowColor;
                ctx.fillStyle = color;
                ctx.fillRect(x, y, barWidth - barGap, barHeight);

                // Draw again without shadow for solid color
                ctx.shadowBlur = 0;
                ctx.fillRect(x, y, barWidth - barGap, barHeight);
            });

            animationFrameRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [spectrum]);

    return (
        <div className="flex h-full w-full flex-col p-4">
            {/* Status Bar */}
            <div className="mb-3 flex flex-shrink-0 items-center justify-between">
                <div className="text-primary flex items-center gap-2 text-xs font-medium tracking-wider">
                    <Activity className="h-4 w-4" />
                    <span>REAL-TIME ANALYSIS</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium">
                    {isConnected ? (
                        <>
                            <div className="h-2 w-2 animate-pulse rounded-full bg-green-400 shadow-lg shadow-green-400/50" />
                            <span className="tracking-wide text-green-400">STREAMING</span>
                        </>
                    ) : (
                        <>
                            <div className="h-2 w-2 rounded-full bg-red-400" />
                            <span className="tracking-wide text-red-400">OFFLINE</span>
                        </>
                    )}
                </div>
            </div>

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                className="border-primary/10 w-full flex-1 rounded-lg border bg-black/40 shadow-inner"
                style={{ imageRendering: "crisp-edges", minHeight: "120px" }}
            />
        </div>
    );
}
