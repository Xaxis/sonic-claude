/**
 * Transport Panel
 *
 * Playback controls and timeline navigation.
 * Play, pause, stop, record, and position display.
 */

import { useState, useEffect } from "react";
import { Panel } from "@/components/ui/panel";
import { SubPanel } from "@/components/ui/sub-panel";
import { TransportButton } from "@/components/ui/transport-button";
import { Knob } from "@/components/ui/knob";
import { useTransportWebSocket } from "@/hooks/useTransportWebsocket";
import { audioEngineService } from "@/services/api/audio-engine.service";
import { Play, Pause, Square, SkipBack } from "lucide-react";

export function TransportPanel() {
    const { transport, isConnected } = useTransportWebSocket();
    const [currentSequenceId, setCurrentSequenceId] = useState<string | null>(null);

    // Load active sequence on mount
    useEffect(() => {
        loadActiveSequence();
    }, []);

    const loadActiveSequence = async () => {
        try {
            const sequences = await audioEngineService.getSequences();
            if (sequences.length > 0) {
                setCurrentSequenceId(sequences[0].id);
            }
        } catch (error) {
            console.error("Failed to load sequences:", error);
        }
    };

    const handlePlay = async () => {
        if (!currentSequenceId) return;
        try {
            await audioEngineService.playSequence(currentSequenceId);
        } catch (error) {
            console.error("Failed to play:", error);
        }
    };

    const handlePause = async () => {
        if (!currentSequenceId) return;
        try {
            await audioEngineService.pauseSequence(currentSequenceId);
        } catch (error) {
            console.error("Failed to pause:", error);
        }
    };

    const handleStop = async () => {
        try {
            await audioEngineService.stopAll();
        } catch (error) {
            console.error("Failed to stop:", error);
        }
    };

    const handleTempoChange = async (newTempo: number) => {
        if (!currentSequenceId) return;
        try {
            await audioEngineService.setTempo(currentSequenceId, { tempo: newTempo });
        } catch (error) {
            console.error("Failed to set tempo:", error);
        }
    };

    const handleSeek = async (position: number) => {
        if (!currentSequenceId) return;
        try {
            await audioEngineService.seek(currentSequenceId, { position });
        } catch (error) {
            console.error("Failed to seek:", error);
        }
    };

    // Format time display (beats or seconds)
    const formatPosition = (beats: number) => {
        const bars = Math.floor(beats / transport.time_signature_num) + 1;
        const beat = Math.floor(beats % transport.time_signature_num) + 1;
        const tick = Math.floor((beats % 1) * 960);
        return `${bars}.${beat}.${tick.toString().padStart(3, "0")}`;
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
    };

    return (
        <Panel title="TRANSPORT" className="flex flex-col">
            <div className="flex-1 p-4">
                <div className="flex gap-4 h-full">
                    {/* Transport Controls */}
                    <SubPanel title="CONTROLS" className="flex-shrink-0">
                        <div className="flex flex-col gap-3 p-4">
                            {/* Main transport buttons */}
                            <div className="flex gap-2 justify-center">
                                <TransportButton
                                    variant="default"
                                    icon={<SkipBack className="h-4 w-4" />}
                                    onClick={() => handleSeek(0)}
                                    title="Return to Start"
                                />
                                <TransportButton
                                    variant="play"
                                    active={transport.is_playing}
                                    icon={<Play className="h-5 w-5" />}
                                    onClick={handlePlay}
                                    disabled={!currentSequenceId}
                                >
                                    PLAY
                                </TransportButton>
                                <TransportButton
                                    variant="default"
                                    icon={<Pause className="h-4 w-4" />}
                                    onClick={handlePause}
                                    disabled={!currentSequenceId}
                                >
                                    PAUSE
                                </TransportButton>
                                <TransportButton
                                    variant="stop"
                                    icon={<Square className="h-4 w-4" />}
                                    onClick={handleStop}
                                >
                                    STOP
                                </TransportButton>
                            </div>

                            {/* Connection status */}
                            <div className="flex items-center justify-center gap-2 text-xs">
                                <div
                                    className={`h-2 w-2 rounded-full ${
                                        isConnected ? "bg-green-500" : "bg-red-500"
                                    }`}
                                />
                                <span className="text-muted-foreground">
                                    {isConnected ? "Connected" : "Disconnected"}
                                </span>
                            </div>
                        </div>
                    </SubPanel>

                    {/* Position Display */}
                    <SubPanel title="POSITION" className="flex-1">
                        <div className="flex flex-col gap-4 p-4">
                            {/* Bar.Beat.Tick */}
                            <div className="text-center">
                                <div className="text-xs text-muted-foreground mb-1">
                                    BAR.BEAT.TICK
                                </div>
                                <div className="text-2xl font-mono font-bold text-cyan-400">
                                    {formatPosition(transport.position_beats)}
                                </div>
                            </div>

                            {/* Time */}
                            <div className="text-center">
                                <div className="text-xs text-muted-foreground mb-1">
                                    TIME
                                </div>
                                <div className="text-xl font-mono text-purple-400">
                                    {formatTime(transport.position_seconds)}
                                </div>
                            </div>
                        </div>
                    </SubPanel>

                    {/* Tempo & Time Signature */}
                    <SubPanel title="TEMPO" className="flex-shrink-0">
                        <div className="flex flex-col items-center gap-4 p-4">
                            {/* Tempo knob */}
                            <Knob
                                value={transport.tempo}
                                onChange={handleTempoChange}
                                label="BPM"
                                min={20}
                                max={300}
                                format="default"
                            />

                            {/* Tempo display */}
                            <div className="text-center">
                                <div className="text-2xl font-mono font-bold text-cyan-400">
                                    {transport.tempo.toFixed(1)}
                                </div>
                                <div className="text-xs text-muted-foreground">BPM</div>
                            </div>

                            {/* Time signature */}
                            <div className="text-center">
                                <div className="text-lg font-mono text-purple-400">
                                    {transport.time_signature_num}/{transport.time_signature_den}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    TIME SIG
                                </div>
                            </div>
                        </div>
                    </SubPanel>
                </div>
            </div>
        </Panel>
    );
}

