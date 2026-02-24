/**
 * Undo/Redo Command Factory Functions
 *
 * Factory functions to create undoable commands for all DAW actions.
 * Each command encapsulates both the forward action and its inverse.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
    CreateTrackCommand,
    DeleteTrackCommand,
    RenameTrackCommand,
    UpdateTrackCommand,
    MuteTrackCommand,
    SoloTrackCommand,
    CreateClipCommand,
    DeleteClipCommand,
    UpdateClipCommand,
    UpdateTempoCommand,
} from './types';
import { api } from '@/services/api';

/**
 * Create Track Command
 */
export function createTrackCommand(
    compositionId: string,
    trackName: string,
    trackType: string,
    instrument?: string,
    onExecute?: (trackId: string) => void,
    onUndo?: () => void
): CreateTrackCommand {
    let createdTrackId: string | null = null;

    return {
        id: uuidv4(),
        type: 'CREATE_TRACK',
        description: `Create Track "${trackName}"`,
        timestamp: Date.now(),
        trackId: '', // Will be set after execution
        trackName,
        trackType,
        instrument,

        execute: async () => {
            const track = await api.compositions.createTrack({
                composition_id: compositionId,
                name: trackName,
                type: trackType,
                instrument,
            });
            createdTrackId = track.id;
            if (onExecute) onExecute(track.id);
        },

        undo: async () => {
            if (createdTrackId) {
                await api.compositions.deleteTrack(compositionId, createdTrackId);
                if (onUndo) onUndo();
            }
        },
    };
}

/**
 * Delete Track Command
 */
export function deleteTrackCommand(
    compositionId: string,
    trackId: string,
    trackData: any,
    onExecute?: () => void,
    onUndo?: () => void
): DeleteTrackCommand {
    return {
        id: uuidv4(),
        type: 'DELETE_TRACK',
        description: `Delete Track "${trackData.name}"`,
        timestamp: Date.now(),
        trackId,
        trackData,

        execute: async () => {
            await api.compositions.deleteTrack(compositionId, trackId);
            if (onExecute) onExecute();
        },

        undo: async () => {
            // Recreate the track with the same data
            await api.compositions.createTrack({
                composition_id: compositionId,
                name: trackData.name,
                type: trackData.type,
                color: trackData.color,
                instrument: trackData.instrument,
            });
            if (onUndo) onUndo();
        },
    };
}

/**
 * Rename Track Command
 */
export function renameTrackCommand(
    compositionId: string,
    trackId: string,
    oldName: string,
    newName: string,
    onExecute?: () => void,
    onUndo?: () => void
): RenameTrackCommand {
    return {
        id: uuidv4(),
        type: 'RENAME_TRACK',
        description: `Rename Track "${oldName}" → "${newName}"`,
        timestamp: Date.now(),
        trackId,
        oldName,
        newName,

        execute: async () => {
            await api.compositions.updateTrack(compositionId, trackId, { name: newName });
            if (onExecute) onExecute();
        },

        undo: async () => {
            await api.compositions.updateTrack(compositionId, trackId, { name: oldName });
            if (onUndo) onUndo();
        },
    };
}

/**
 * Update Track Command (volume, pan, instrument)
 */
export function updateTrackCommand(
    compositionId: string,
    trackId: string,
    trackName: string,
    oldValues: { volume?: number; pan?: number; instrument?: string },
    newValues: { volume?: number; pan?: number; instrument?: string },
    onExecute?: () => void,
    onUndo?: () => void
): UpdateTrackCommand {
    const changes = Object.keys(newValues).map(key => `${key}=${newValues[key as keyof typeof newValues]}`).join(', ');

    return {
        id: uuidv4(),
        type: 'UPDATE_TRACK',
        description: `Update Track "${trackName}" (${changes})`,
        timestamp: Date.now(),
        trackId,
        oldValues,
        newValues,

        execute: async () => {
            await api.compositions.updateTrack(compositionId, trackId, newValues);
            if (onExecute) onExecute();
        },

        undo: async () => {
            await api.compositions.updateTrack(compositionId, trackId, oldValues);
            if (onUndo) onUndo();
        },
    };
}

/**
 * Mute Track Command
 */
export function muteTrackCommand(
    compositionId: string,
    trackId: string,
    trackName: string,
    oldMuted: boolean,
    newMuted: boolean,
    onExecute?: () => void,
    onUndo?: () => void
): MuteTrackCommand {
    return {
        id: uuidv4(),
        type: 'MUTE_TRACK',
        description: `${newMuted ? 'Mute' : 'Unmute'} Track "${trackName}"`,
        timestamp: Date.now(),
        trackId,
        oldMuted,
        newMuted,

        execute: async () => {
            await api.compositions.muteTrack(compositionId, trackId, newMuted);
            if (onExecute) onExecute();
        },

        undo: async () => {
            await api.compositions.muteTrack(compositionId, trackId, oldMuted);
            if (onUndo) onUndo();
        },
    };
}

/**
 * Solo Track Command
 */
export function soloTrackCommand(
    compositionId: string,
    trackId: string,
    trackName: string,
    oldSolo: boolean,
    newSolo: boolean,
    onExecute?: () => void,
    onUndo?: () => void
): SoloTrackCommand {
    return {
        id: uuidv4(),
        type: 'SOLO_TRACK',
        description: `${newSolo ? 'Solo' : 'Unsolo'} Track "${trackName}"`,
        timestamp: Date.now(),
        trackId,
        oldSolo,
        newSolo,

        execute: async () => {
            await api.compositions.soloTrack(compositionId, trackId, newSolo);
            if (onExecute) onExecute();
        },

        undo: async () => {
            await api.compositions.soloTrack(compositionId, trackId, oldSolo);
            if (onUndo) onUndo();
        },
    };
}

/**
 * Create Clip Command
 */
export function createClipCommand(
    request: any,
    onExecute?: (clipId: string) => void,
    onUndo?: () => void
): CreateClipCommand {
    let createdClipId: string | null = null;

    return {
        id: uuidv4(),
        type: 'CREATE_CLIP',
        description: `Create Clip "${request.name || 'Untitled'}"`,
        timestamp: Date.now(),
        clipId: '',
        clipData: request,

        execute: async () => {
            const clip = await api.compositions.addClip(request);
            createdClipId = clip.id;
            if (onExecute) onExecute(clip.id);
        },

        undo: async () => {
            if (createdClipId && request.sequence_id) {
                await api.compositions.deleteClip(request.sequence_id, createdClipId);
                if (onUndo) onUndo();
            }
        },
    };
}

/**
 * Delete Clip Command
 */
export function deleteClipCommand(
    compositionId: string,
    clipId: string,
    clipData: any,
    onExecute?: () => void,
    onUndo?: () => void
): DeleteClipCommand {
    return {
        id: uuidv4(),
        type: 'DELETE_CLIP',
        description: `Delete Clip "${clipData.name || 'Untitled'}"`,
        timestamp: Date.now(),
        clipId,
        clipData,

        execute: async () => {
            await api.compositions.deleteClip(compositionId, clipId);
            if (onExecute) onExecute();
        },

        undo: async () => {
            // Recreate the clip with the same data
            await api.compositions.createClip(compositionId, clipData);
            if (onUndo) onUndo();
        },
    };
}

/**
 * Update Clip Command
 */
export function updateClipCommand(
    compositionId: string,
    clipId: string,
    oldClip: any,
    newValues: any,
    onExecute?: () => void,
    onUndo?: () => void
): UpdateClipCommand {
    // Extract only the fields that are changing from the old clip
    const oldValues: any = {};
    if (newValues.start_time !== undefined) oldValues.start_time = oldClip.start_time;
    if (newValues.duration !== undefined) oldValues.duration = oldClip.duration;
    if (newValues.midi_events !== undefined) oldValues.midi_events = oldClip.midi_events;
    if (newValues.is_muted !== undefined) oldValues.is_muted = oldClip.is_muted;
    if (newValues.is_looped !== undefined) oldValues.is_looped = oldClip.is_looped;
    if (newValues.gain !== undefined) oldValues.gain = oldClip.gain;
    if (newValues.audio_offset !== undefined) oldValues.audio_offset = oldClip.audio_offset;

    return {
        id: uuidv4(),
        type: 'UPDATE_CLIP',
        description: `Update Clip "${oldClip.name || 'Untitled'}"`,
        timestamp: Date.now(),
        clipId,
        oldValues,
        newValues,

        execute: async () => {
            await api.compositions.updateClip(compositionId, clipId, newValues);
            if (onExecute) onExecute();
        },

        undo: async () => {
            await api.compositions.updateClip(compositionId, clipId, oldValues);
            if (onUndo) onUndo();
        },
    };
}

/**
 * Update Tempo Command
 */
export function updateTempoCommand(
    compositionId: string,
    oldTempo: number,
    newTempo: number,
    onExecute?: () => void,
    onUndo?: () => void
): UpdateTempoCommand {
    return {
        id: uuidv4(),
        type: 'UPDATE_TEMPO',
        description: `Change Tempo ${oldTempo} → ${newTempo} BPM`,
        timestamp: Date.now(),
        oldTempo,
        newTempo,

        execute: async () => {
            await api.playback.setTempo({ tempo: newTempo });
            if (onExecute) onExecute();
        },

        undo: async () => {
            await api.playback.setTempo({ tempo: oldTempo });
            if (onUndo) onUndo();
        },
    };
}
