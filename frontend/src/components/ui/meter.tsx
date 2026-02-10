/**
 * Meter Component
 *
 * Vertical VU meter for displaying audio levels.
 * Shows peak and RMS levels with color-coded zones.
 */

import { cn } from "@/lib/utils";

export interface MeterProps {
    /** Peak level in dB (-96 to 0) */
    peak: number;
    /** RMS level in dB (-96 to 0) */
    rms?: number;
    /** Whether to show stereo (L/R) or mono */
    stereo?: boolean;
    /** Peak level for right channel (stereo only) */
    peakRight?: number;
    /** RMS level for right channel (stereo only) */
    rmsRight?: number;
    /** Additional CSS classes */
    className?: string;
}

export function Meter({ peak, rms, stereo = false, peakRight, rmsRight, className }: MeterProps) {
    // Convert dB to percentage (0-1)
    const dbToPercent = (db: number) => {
        return Math.max(0, Math.min(1, (db + 96) / 96));
    };

    // Get color based on dB level
    const getColor = (db: number) => {
        if (db > -3) return "bg-red-500";
        if (db > -12) return "bg-yellow-500";
        return "bg-green-500";
    };

    const renderChannel = (peakDb: number, rmsDb?: number) => {
        const peakPercent = dbToPercent(peakDb);
        const rmsPercent = rmsDb !== undefined ? dbToPercent(rmsDb) : peakPercent;

        return (
            <div className="relative h-full w-2 rounded border border-white/10 bg-black/40">
                {/* RMS level (background) */}
                {rmsDb !== undefined && (
                    <div
                        className={cn(
                            "absolute right-0 bottom-0 left-0 rounded-b opacity-60",
                            getColor(rmsDb)
                        )}
                        style={{ height: `${rmsPercent * 100}%` }}
                    />
                )}

                {/* Peak level */}
                <div
                    className={cn(
                        "absolute right-0 bottom-0 left-0 rounded-b transition-all duration-75",
                        getColor(peakDb)
                    )}
                    style={{ height: `${peakPercent * 100}%` }}
                />

                {/* Clip indicator (red zone at top) */}
                <div className="absolute top-0 right-0 left-0 h-1 rounded-t bg-red-500/20" />
            </div>
        );
    };

    return (
        <div className={cn("flex h-32 gap-1", className)}>
            {/* Left/Mono channel */}
            {renderChannel(peak, rms)}

            {/* Right channel (stereo only) */}
            {stereo && peakRight !== undefined && renderChannel(peakRight, rmsRight)}
        </div>
    );
}
