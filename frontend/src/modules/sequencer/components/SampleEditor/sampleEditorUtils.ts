/**
 * sampleEditorUtils - Shared utilities for the sample editor
 *
 * Time formatting, smart interval calculation, clip defaults, and debounce.
 * Kept separate so SampleEditorRuler, SampleEditorControls, and
 * SampleEditorWaveform can all import without circular dependencies.
 */

import type { SequencerClip } from "../../types";

// ============================================================================
// TIME FORMATTING
// ============================================================================

export interface SmartIntervals {
    major: number;
    minor: number | null;
}

/** Returns major + minor tick intervals appropriate for a given sample duration. */
export function getSmartInterval(duration: number): SmartIntervals {
    if (duration <= 0.3)  return { major: 0.05,  minor: 0.01  };
    if (duration <= 1)    return { major: 0.1,   minor: 0.05  };
    if (duration <= 3)    return { major: 0.5,   minor: 0.1   };
    if (duration <= 10)   return { major: 1,     minor: 0.25  };
    if (duration <= 30)   return { major: 2,     minor: 0.5   };
    if (duration <= 60)   return { major: 5,     minor: 1     };
    if (duration <= 120)  return { major: 10,    minor: 2     };
    if (duration <= 300)  return { major: 30,    minor: 5     };
    return                       { major: 60,    minor: 10    };
}

/** Formats seconds as ms / s / min:sec depending on magnitude. */
export function formatTime(seconds: number): string {
    if (seconds === 0) return "0";
    if (seconds < 1)   return `${Math.round(seconds * 1000)}ms`;
    if (seconds < 60)  return `${seconds % 1 === 0 ? seconds.toFixed(0) : seconds.toFixed(seconds < 10 ? 2 : 1)}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(Math.round(s)).padStart(2, "0")}`;
}

// ============================================================================
// CLIP FIELD DEFAULTS
// ============================================================================

/** Normalises all audio-edit clip fields: null → undefined / sensible defaults. */
export function safeClipDefaults(clip: SequencerClip) {
    return {
        audioOffset:    clip.audio_offset    ?? 0,
        audioEnd:       clip.audio_end       ?? undefined,
        pitchSemitones: clip.pitch_semitones ?? 0,
        playbackRate:   clip.playback_rate   ?? 1.0,
        gain:           clip.gain            ?? 1.0,
        fadeIn:         clip.fade_in         ?? 0,
        fadeOut:        clip.fade_out        ?? 0,
        reverse:        clip.reverse         ?? false,
        loopEnabled:    clip.loop_enabled    ?? false,
        loopStart:      clip.loop_start      ?? 0,
        loopEnd:        clip.loop_end        ?? undefined,
    };
}

// ============================================================================
// DEBOUNCE
// ============================================================================

export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
    let timer: ReturnType<typeof setTimeout>;
    return ((...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    }) as T;
}
