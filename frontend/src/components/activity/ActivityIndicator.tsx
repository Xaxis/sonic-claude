/**
 * ActivityIndicator - Animated visual indicator for AI actions
 *
 * Shows beautiful themed animations when AI performs actions.
 * Different styles for different action types.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
    Plus,
    Music,
    Edit,
    Trash2,
    Sparkles,
    Sliders,
    Gauge,
    Play,
    Square,
    Loader2,
} from "lucide-react";
import type { AIActivity } from "@/contexts/ActivityContext";

// Action type to visual mapping
const ACTION_STYLES = {
    create_track: {
        color: "cyan",
        icon: Plus,
        bgClass: "bg-cyan-500/20",
        borderClass: "border-cyan-500",
        textClass: "text-cyan-400",
        glowClass: "glow-cyan",
    },
    create_midi_clip: {
        color: "cyan",
        icon: Music,
        bgClass: "bg-cyan-500/20",
        borderClass: "border-cyan-500",
        textClass: "text-cyan-400",
        glowClass: "glow-cyan",
    },
    modify_clip: {
        color: "magenta",
        icon: Edit,
        bgClass: "bg-purple-500/20",
        borderClass: "border-purple-500",
        textClass: "text-purple-400",
        glowClass: "glow-magenta",
    },
    delete_clip: {
        color: "red",
        icon: Trash2,
        bgClass: "bg-red-500/20",
        borderClass: "border-red-500",
        textClass: "text-red-400",
        glowClass: "shadow-lg shadow-red-500/20",
    },
    add_effect: {
        color: "yellow",
        icon: Sparkles,
        bgClass: "bg-yellow-500/20",
        borderClass: "border-yellow-500",
        textClass: "text-yellow-400",
        glowClass: "glow-yellow",
    },
    set_track_parameter: {
        color: "magenta",
        icon: Sliders,
        bgClass: "bg-purple-500/20",
        borderClass: "border-purple-500",
        textClass: "text-purple-400",
        glowClass: "glow-magenta",
    },
    set_tempo: {
        color: "yellow",
        icon: Gauge,
        bgClass: "bg-yellow-500/20",
        borderClass: "border-yellow-500",
        textClass: "text-yellow-400",
        glowClass: "glow-yellow",
    },
    play_sequence: {
        color: "cyan",
        icon: Play,
        bgClass: "bg-cyan-500/20",
        borderClass: "border-cyan-500",
        textClass: "text-cyan-400",
        glowClass: "glow-cyan",
    },
    stop_playback: {
        color: "red",
        icon: Square,
        bgClass: "bg-red-500/20",
        borderClass: "border-red-500",
        textClass: "text-red-400",
        glowClass: "shadow-lg shadow-red-500/20",
    },
    set_effect_parameter: {
        color: "magenta",
        icon: Sliders,
        bgClass: "bg-purple-500/20",
        borderClass: "border-purple-500",
        textClass: "text-purple-400",
        glowClass: "glow-magenta",
    },
    default: {
        color: "cyan",
        icon: Loader2,
        bgClass: "bg-cyan-500/20",
        borderClass: "border-cyan-500",
        textClass: "text-cyan-400",
        glowClass: "glow-cyan",
    },
};

interface ActivityIndicatorProps {
    activity: AIActivity;
    onComplete?: () => void;
}

export function ActivityIndicator({ activity, onComplete }: ActivityIndicatorProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    const style = ACTION_STYLES[activity.action as keyof typeof ACTION_STYLES] || ACTION_STYLES.default;
    const Icon = style.icon;

    // Entrance animation
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    // Auto-exit after duration
    useEffect(() => {
        if (activity.status === "success" || activity.status === "error") {
            const exitTimer = setTimeout(() => {
                setIsExiting(true);
                setTimeout(() => {
                    onComplete?.();
                }, 300); // Exit animation duration
            }, activity.duration || 1500);

            return () => clearTimeout(exitTimer);
        }
    }, [activity.status, activity.duration, onComplete]);

    return (
        <div
            className={cn(
                "pointer-events-none fixed z-50 flex items-center gap-3 rounded-lg border-2 px-4 py-3 backdrop-blur-sm transition-all duration-300",
                style.bgClass,
                style.borderClass,
                style.glowClass,
                isVisible && !isExiting && "opacity-100 translate-y-0 scale-100",
                !isVisible && "opacity-0 translate-y-4 scale-95",
                isExiting && "opacity-0 translate-y--4 scale-95"
            )}
            style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
            }}
        >
            {/* Icon */}
            <Icon
                className={cn(
                    "h-5 w-5 flex-shrink-0",
                    style.textClass,
                    activity.status === "in-progress" && "animate-spin"
                )}
            />

            {/* Message */}
            <p className={cn("font-mono text-sm font-medium", style.textClass)}>
                {activity.message}
            </p>
        </div>
    );
}

