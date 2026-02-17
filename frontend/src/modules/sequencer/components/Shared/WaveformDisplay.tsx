/**
 * WaveformDisplay - Reusable waveform visualization component
 * 
 * Renders audio waveform data on a canvas with customizable styling.
 * Supports both mono and stereo waveforms.
 */

import { useEffect, useRef } from "react";

interface WaveformDisplayProps {
    /** Waveform data for mono or left channel */
    data: number[];
    /** Optional right channel data for stereo display */
    rightData?: number[];
    /** Canvas width in pixels */
    width?: number;
    /** Canvas height in pixels */
    height?: number;
    /** Waveform color (CSS color string) */
    color?: string;
    /** Right channel color for stereo (CSS color string) */
    rightColor?: string;
    /** Background color (CSS color string) */
    backgroundColor?: string;
    /** Whether to show grid lines */
    showGrid?: boolean;
    /** Grid line color (CSS color string) */
    gridColor?: string;
    /** Whether to add glow effect */
    glowEffect?: boolean;
    /** CSS class name for the canvas element */
    className?: string;
}

export function WaveformDisplay({
    data,
    rightData,
    width,
    height,
    color = "rgba(6, 182, 212, 1)", // cyan
    rightColor = "rgba(192, 132, 252, 1)", // purple
    backgroundColor = "hsl(220 15% 6%)",
    showGrid = false,
    gridColor = "hsl(220 15% 15%)",
    glowEffect = false,
    className = "",
}: WaveformDisplayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length === 0) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Get canvas dimensions
        const rect = canvas.getBoundingClientRect();
        const canvasWidth = width || rect.width;
        const canvasHeight = height || rect.height;

        // Set canvas resolution for high DPI displays
        canvas.width = canvasWidth * window.devicePixelRatio;
        canvas.height = canvasHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Clear canvas
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw grid if enabled
        if (showGrid) {
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;

            // Horizontal grid lines
            for (let i = 0; i <= 4; i++) {
                const y = (canvasHeight / 4) * i;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvasWidth, y);
                ctx.stroke();
            }

            // Vertical grid lines (only for stereo or if explicitly needed)
            if (rightData) {
                for (let i = 0; i <= 8; i++) {
                    const x = (canvasWidth / 8) * i;
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, canvasHeight);
                    ctx.stroke();
                }
            }
        }

        const midY = canvasHeight / 2;

        // Draw left/mono channel waveform
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        if (glowEffect) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
        }
        ctx.beginPath();
        data.forEach((value, index) => {
            const x = (index / data.length) * canvasWidth;
            const y = rightData
                ? midY - value * midY * 0.8 // Stereo: top half
                : midY - value * midY; // Mono: full height
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw right channel if stereo
        if (rightData && rightData.length > 0) {
            ctx.strokeStyle = rightColor;
            if (glowEffect) {
                ctx.shadowColor = rightColor;
            }
            ctx.beginPath();
            rightData.forEach((value, index) => {
                const x = (index / rightData.length) * canvasWidth;
                const y = midY + value * midY * 0.8; // Bottom half
                if (index === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }

        // Draw center line
        if (glowEffect || rightData) {
            ctx.shadowBlur = 0;
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, midY);
            ctx.lineTo(canvasWidth, midY);
            ctx.stroke();
        }
    }, [data, rightData, width, height, color, rightColor, backgroundColor, showGrid, gridColor, glowEffect]);

    return <canvas ref={canvasRef} className={className} style={{ width: "100%", height: "100%" }} />;
}

