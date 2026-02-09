/**
 * Timeline/Sequencer Component
 * DAW-style timeline with multi-track piano roll editing
 * Integrates with live transcription system
 */
import { useState, useCallback, useEffect } from "react";
import { Play, Pause, Square, SkipBack, Plus, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrackList } from "./TrackList";
import { TimelineCanvas } from "./TimelineCanvas";
import { TransportControls } from "./TransportControls";
import { api } from "@/lib/api";
import type { TimelineSequence, Track, Clip, MIDIEvent, LiveTranscriptionResult } from "@/types";

interface TimelineProps {
    sequenceId?: string | null;
}

export function Timeline({ sequenceId }: TimelineProps = {}) {
    // Sequence state
    const [sequence, setSequence] = useState<TimelineSequence>({
        id: `seq-${Date.now()}`,
        name: "Untitled Sequence",
        created_at: Date.now(),
        updated_at: Date.now(),
        tracks: [],
        tempo: 120,
        time_signature_numerator: 4,
        time_signature_denominator: 4,
        key: "C",
        scale: "major",
        zoom_level: 1.0,
        scroll_position: 0,
        is_playing: false,
        is_recording: false,
        playhead_position: 0,
        loop_enabled: false,
        loop_start: 0,
        loop_end: 16,
    });

    const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Load sequence from backend when sequenceId changes
    useEffect(() => {
        if (sequenceId) {
            loadSequence(sequenceId);
        }
    }, [sequenceId]);

    const loadSequence = async (id: string) => {
        try {
            setIsLoading(true);
            const loadedSequence = await api.getSequence(id);
            setSequence(loadedSequence);
        } catch (error) {
            console.error("Failed to load sequence:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Transport controls
    const handlePlay = useCallback(async () => {
        if (!sequenceId) {
            alert("No sequence loaded. Please create or load a sequence first.");
            return;
        }

        try {
            setSequence(prev => ({ ...prev, is_playing: true }));
            const response = await api.playSequence(sequenceId);
            console.log("✅ Playing sequence:", response);
        } catch (error) {
            console.error("❌ Failed to play sequence:", error);
            setSequence(prev => ({ ...prev, is_playing: false }));
            alert("Failed to play sequence. Make sure Sonic Pi is running.");
        }
    }, [sequenceId]);

    const handlePause = useCallback(async () => {
        if (!sequenceId) return;

        try {
            await api.stopSequence(sequenceId);
            setSequence(prev => ({ ...prev, is_playing: false }));
        } catch (error) {
            console.error("❌ Failed to pause sequence:", error);
        }
    }, [sequenceId]);

    const handleStop = useCallback(async () => {
        if (!sequenceId) return;

        try {
            await api.stopSequence(sequenceId);
            setSequence(prev => ({
                ...prev,
                is_playing: false,
                playhead_position: 0,
            }));
        } catch (error) {
            console.error("❌ Failed to stop sequence:", error);
        }
    }, [sequenceId]);

    const handleRewind = useCallback(() => {
        setSequence(prev => ({ ...prev, playhead_position: 0 }));
    }, []);

    // Track management
    const handleAddTrack = useCallback(() => {
        const newTrack: Track = {
            id: `track-${Date.now()}`,
            name: `Track ${sequence.tracks.length + 1}`,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            height: 100,
            clips: [],
            instrument: "piano",
            midi_channel: sequence.tracks.length,
            volume: 1.0,
            pan: 0.0,
            is_muted: false,
            is_solo: false,
            is_armed: false,
        };

        setSequence(prev => ({
            ...prev,
            tracks: [...prev.tracks, newTrack],
            updated_at: Date.now(),
        }));
    }, [sequence.tracks.length]);

    const handleDeleteTrack = useCallback((trackId: string) => {
        setSequence(prev => ({
            ...prev,
            tracks: prev.tracks.filter(t => t.id !== trackId),
            updated_at: Date.now(),
        }));
        if (selectedTrackId === trackId) {
            setSelectedTrackId(null);
        }
    }, [selectedTrackId]);

    const handleUpdateTrack = useCallback((trackId: string, updates: Partial<Track>) => {
        setSequence(prev => ({
            ...prev,
            tracks: prev.tracks.map(t =>
                t.id === trackId ? { ...t, ...updates } : t
            ),
            updated_at: Date.now(),
        }));
    }, []);

    // Clip management
    const handleAddClip = useCallback((trackId: string, startTime: number) => {
        const newClip: Clip = {
            id: `clip-${Date.now()}`,
            name: "New Clip",
            type: "midi",
            track_id: trackId,
            start_time: startTime,
            duration: 4,  // 4 beats default
            color: "#3b82f6",
            midi_events: [],
            audio_offset: 0,
            is_muted: false,
            is_looped: false,
            loop_count: 1,
        };

        setSequence(prev => ({
            ...prev,
            tracks: prev.tracks.map(t =>
                t.id === trackId
                    ? { ...t, clips: [...t.clips, newClip] }
                    : t
            ),
            updated_at: Date.now(),
        }));
    }, []);

    const handleUpdateClip = useCallback((clipId: string, updates: Partial<Clip>) => {
        setSequence(prev => ({
            ...prev,
            tracks: prev.tracks.map(t => ({
                ...t,
                clips: t.clips.map(c =>
                    c.id === clipId ? { ...c, ...updates } : c
                ),
            })),
            updated_at: Date.now(),
        }));
    }, []);

    const handleDeleteClip = useCallback((clipId: string) => {
        setSequence(prev => ({
            ...prev,
            tracks: prev.tracks.map(t => ({
                ...t,
                clips: t.clips.filter(c => c.id !== clipId),
            })),
            updated_at: Date.now(),
        }));
    }, []);

    return (
        <div className="flex h-full flex-col gap-3 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isEditingName ? (
                        <Input
                            value={sequence.name}
                            onChange={(e) => setSequence(prev => ({ ...prev, name: e.target.value }))}
                            onBlur={() => setIsEditingName(false)}
                            onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                            className="w-64"
                            autoFocus
                        />
                    ) : (
                        <h2
                            className="text-primary cursor-pointer text-lg font-bold"
                            onClick={() => setIsEditingName(true)}
                        >
                            {sequence.name}
                        </h2>
                    )}
                    <span className="text-muted-foreground text-sm">
                        {sequence.tempo} BPM • {sequence.time_signature_numerator}/{sequence.time_signature_denominator}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Button onClick={handleAddTrack} size="sm" variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Track
                    </Button>
                    <Button size="sm" variant="outline">
                        <Save className="mr-2 h-4 w-4" />
                        Save
                    </Button>
                </div>
            </div>

            {/* Transport Controls */}
            <TransportControls
                isPlaying={sequence.is_playing}
                tempo={sequence.tempo}
                playheadPosition={sequence.playhead_position}
                onPlay={handlePlay}
                onPause={handlePause}
                onStop={handleStop}
                onRewind={handleRewind}
                onTempoChange={(tempo) => setSequence(prev => ({ ...prev, tempo }))}
            />

            {/* Timeline */}
            <div className="panel-glass min-h-0 flex-1 overflow-hidden rounded-xl">
                <div className="flex h-full">
                    {/* Track List */}
                    <TrackList
                        tracks={sequence.tracks}
                        selectedTrackId={selectedTrackId}
                        onSelectTrack={setSelectedTrackId}
                        onUpdateTrack={handleUpdateTrack}
                        onDeleteTrack={handleDeleteTrack}
                    />

                    {/* Timeline Canvas */}
                    <TimelineCanvas
                        sequence={sequence}
                        selectedTrackId={selectedTrackId}
                        selectedClipId={selectedClipId}
                        onSelectClip={setSelectedClipId}
                        onAddClip={handleAddClip}
                        onUpdateClip={handleUpdateClip}
                        onDeleteClip={handleDeleteClip}
                    />
                </div>
            </div>
        </div>
    );
}

