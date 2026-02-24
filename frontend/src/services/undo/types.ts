/**
 * Undo/Redo System Types
 * 
 * Command Pattern implementation for DAW undo/redo functionality.
 * Each undoable action is encapsulated as a command with execute/undo methods.
 */

/**
 * Base interface for all undoable commands
 */
export interface UndoableCommand {
    /** Unique ID for this command */
    id: string;
    
    /** Command type (for debugging and grouping) */
    type: string;
    
    /** Human-readable description (e.g., "Create Track 'Drums'") */
    description: string;
    
    /** Timestamp when command was executed */
    timestamp: number;
    
    /** Execute the command (forward action) */
    execute: () => Promise<void>;
    
    /** Undo the command (inverse action) */
    undo: () => Promise<void>;
    
    /** Optional metadata for debugging */
    metadata?: Record<string, any>;
}

/**
 * Track-related commands
 */
export interface CreateTrackCommand extends UndoableCommand {
    type: 'CREATE_TRACK';
    trackId: string;
    trackName: string;
    trackType: string;
    instrument?: string;
}

export interface DeleteTrackCommand extends UndoableCommand {
    type: 'DELETE_TRACK';
    trackId: string;
    trackData: any; // Snapshot of track data for restoration
}

export interface RenameTrackCommand extends UndoableCommand {
    type: 'RENAME_TRACK';
    trackId: string;
    oldName: string;
    newName: string;
}

export interface UpdateTrackCommand extends UndoableCommand {
    type: 'UPDATE_TRACK';
    trackId: string;
    oldValues: { volume?: number; pan?: number; instrument?: string };
    newValues: { volume?: number; pan?: number; instrument?: string };
}

export interface MuteTrackCommand extends UndoableCommand {
    type: 'MUTE_TRACK';
    trackId: string;
    oldMuted: boolean;
    newMuted: boolean;
}

export interface SoloTrackCommand extends UndoableCommand {
    type: 'SOLO_TRACK';
    trackId: string;
    oldSolo: boolean;
    newSolo: boolean;
}

/**
 * Clip-related commands
 */
export interface CreateClipCommand extends UndoableCommand {
    type: 'CREATE_CLIP';
    clipId: string;
    clipData: any;
}

export interface DeleteClipCommand extends UndoableCommand {
    type: 'DELETE_CLIP';
    clipId: string;
    clipData: any; // Snapshot for restoration
}

export interface UpdateClipCommand extends UndoableCommand {
    type: 'UPDATE_CLIP';
    clipId: string;
    oldValues: any;
    newValues: any;
}

/**
 * Composition-related commands
 */
export interface UpdateTempoCommand extends UndoableCommand {
    type: 'UPDATE_TEMPO';
    oldTempo: number;
    newTempo: number;
}

export interface UpdateLoopCommand extends UndoableCommand {
    type: 'UPDATE_LOOP';
    oldStart: number;
    oldEnd: number;
    newStart: number;
    newEnd: number;
}

/**
 * Union type of all command types
 */
export type Command =
    | CreateTrackCommand
    | DeleteTrackCommand
    | RenameTrackCommand
    | UpdateTrackCommand
    | MuteTrackCommand
    | SoloTrackCommand
    | CreateClipCommand
    | DeleteClipCommand
    | UpdateClipCommand
    | UpdateTempoCommand
    | UpdateLoopCommand;

/**
 * Undo/Redo state
 */
export interface UndoRedoState {
    undoStack: UndoableCommand[];
    redoStack: UndoableCommand[];
    maxHistorySize: number;
    isUndoing: boolean;
    isRedoing: boolean;
}

/**
 * Undo/Redo actions
 */
export interface UndoRedoActions {
    undo: () => Promise<void>;
    redo: () => Promise<void>;
    canUndo: () => boolean;
    canRedo: () => boolean;
    clearHistory: () => void;
    pushCommand: (command: UndoableCommand) => void;
}

