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
        const waveformScale = 0.85; // Scale waveform to 85% of available height

        // Check if we have stereo data
        const isStereo = rightData && rightData.length > 0;

        if (isStereo) {
            // Stereo mode: Top half = left channel, Bottom half = right channel (Ableton style)

            // Draw left channel in top half
            ctx.fillStyle = color;
            if (glowEffect) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = color;
            }

            // Top half - left channel (mirrored within top half)
            const topMidY = canvasHeight / 4;
            ctx.beginPath();
            ctx.moveTo(0, topMidY);
            data.forEach((value, index) => {
                const x = (index / data.length) * canvasWidth;
                const y = topMidY - value * topMidY * waveformScale;
                ctx.lineTo(x, y);
            });
            ctx.lineTo(canvasWidth, topMidY);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, topMidY);
            data.forEach((value, index) => {
                const x = (index / data.length) * canvasWidth;
                const y = topMidY + value * topMidY * waveformScale;
                ctx.lineTo(x, y);
            });
            ctx.lineTo(canvasWidth, topMidY);
            ctx.closePath();
            ctx.fill();

            // Draw right channel in bottom half
            ctx.fillStyle = rightColor;
            if (glowEffect) {
                ctx.shadowColor = rightColor;
            }

            // Bottom half - right channel (mirrored within bottom half)
            const bottomMidY = (canvasHeight * 3) / 4;
            ctx.beginPath();
            ctx.moveTo(0, bottomMidY);
            rightData.forEach((value, index) => {
                const x = (index / rightData.length) * canvasWidth;
                const y = bottomMidY - value * (canvasHeight / 4) * waveformScale;
                ctx.lineTo(x, y);
            });
            ctx.lineTo(canvasWidth, bottomMidY);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(0, bottomMidY);
            rightData.forEach((value, index) => {
                const x = (index / rightData.length) * canvasWidth;
                const y = bottomMidY + value * (canvasHeight / 4) * waveformScale;
                ctx.lineTo(x, y);
            });
            ctx.lineTo(canvasWidth, bottomMidY);
            ctx.closePath();
            ctx.fill();
        } else {
            // Mono mode: Mirror waveform across center line
            ctx.fillStyle = color;
            if (glowEffect) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = color;
            }

            // Draw top half (mirrored)
            ctx.beginPath();
            ctx.moveTo(0, midY);
            data.forEach((value, index) => {
                const x = (index / data.length) * canvasWidth;
                const y = midY - value * midY * waveformScale;
                ctx.lineTo(x, y);
            });
            ctx.lineTo(canvasWidth, midY);
            ctx.closePath();
            ctx.fill();

            // Draw bottom half (mirrored)
            ctx.beginPath();
            ctx.moveTo(0, midY);
            data.forEach((value, index) => {
                const x = (index / data.length) * canvasWidth;
                const y = midY + value * midY * waveformScale;
                ctx.lineTo(x, y);
            });
            ctx.lineTo(canvasWidth, midY);
            ctx.closePath();
            ctx.fill();
        }
    }, [data, rightData, width, height, color, rightColor, backgroundColor, showGrid, gridColor, glowEffect]);

    return <canvas ref={canvasRef} className={className} style={{ width: "100%", height: "100%" }} />;
}

