import { useState, useEffect, useCallback } from "react";
import { Volume2, Grid3x3 } from "lucide-react";
import { api } from "@/lib/api";
import { audioEngine } from "@/services/AudioEngine";
import { useSampleLibrary } from "@/hooks/useSampleLibrary";
import { PadGrid } from "./PadGrid";
import { PadEditor } from "./PadEditor";
import { SampleLibrary } from "./SampleLibrary";
import { BankControls } from "./BankControls";
import { MasterControls } from "./MasterControls";
import type { Sample, PadConfig, PadBank, PadsState } from "@/types";

// Default keyboard layout for 16 pads (4x4 grid)
const DEFAULT_KEYS = [
    "q", "w", "e", "r",
    "a", "s", "d", "f",
    "z", "x", "c", "v",
    "1", "2", "3", "4",
];

// Pad colors - theme-compatible using CSS variables
const PAD_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(var(--accent))",
    "hsl(220 70% 50%)", // blue
    "hsl(160 60% 45%)", // teal
    "hsl(280 60% 50%)", // purple
    "hsl(340 60% 50%)", // pink
    "hsl(30 70% 50%)",  // orange
];

// Create default pad
const createDefaultPad = (index: number): PadConfig => ({
    id: `pad-${index}`,
    sampleId: null,
    sampleName: null,
    state: "empty",
    playbackMode: "one-shot",
    volume: 0.8,
    pitch: 0,
    pan: 0,
    attack: 0,
    release: 0,
    chokeGroup: null,
    color: PAD_COLORS[index % PAD_COLORS.length],
    keyboardKey: DEFAULT_KEYS[index] || null,
});

// Create default bank
const createDefaultBank = (id: string, name: string): PadBank => ({
    id,
    name,
    pads: Array.from({ length: 16 }, (_, i) => createDefaultPad(i)),
});

export function Pads() {
    // Use auto-updating sample library hook
    const { samples } = useSampleLibrary();

    const [padsState, setPadsState] = useState<PadsState>(() => {
        // Load from localStorage or create default
        const saved = localStorage.getItem("pads-state");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Migrate old data: ensure all pads have colors
                const migrated = {
                    ...parsed,
                    banks: parsed.banks.map((bank: PadBank) => ({
                        ...bank,
                        pads: bank.pads.map((pad: PadConfig, index: number) => ({
                            ...pad,
                            color: pad.color || PAD_COLORS[index % PAD_COLORS.length],
                        })),
                    })),
                };
                return migrated;
            } catch (e) {
                console.error("Failed to parse saved pads state:", e);
            }
        }
        return {
            banks: [
                createDefaultBank("bank-a", "A"),
                createDefaultBank("bank-b", "B"),
                createDefaultBank("bank-c", "C"),
                createDefaultBank("bank-d", "D"),
            ],
            activeBankId: "bank-a",
            masterVolume: 0.8,
            quantizeEnabled: false,
        };
    });

    const [selectedPadId, setSelectedPadId] = useState<string | null>(null);
    const [draggedSample, setDraggedSample] = useState<Sample | null>(null);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem("pads-state", JSON.stringify(padsState));
    }, [padsState]);

    const activeBank = padsState.banks.find((b) => b.id === padsState.activeBankId);
    const selectedPad = activeBank?.pads.find((p) => p.id === selectedPadId);

    // Update pad in active bank
    const updatePad = useCallback(
        (padId: string, updates: Partial<PadConfig>) => {
            setPadsState((prev) => {
                const newState = {
                    ...prev,
                    banks: prev.banks.map((bank) =>
                        bank.id === prev.activeBankId
                            ? {
                                  ...bank,
                                  pads: bank.pads.map((pad) =>
                                      pad.id === padId ? { ...pad, ...updates } : pad
                                  ),
                              }
                            : bank
                    ),
                };

                // If the pad is currently playing, update the active playback parameters
                const updatedPad = newState.banks
                    .find((b) => b.id === newState.activeBankId)
                    ?.pads.find((p) => p.id === padId);

                if (updatedPad && audioEngine.isPlaying(padId)) {
                    // Update volume if changed
                    if (updates.volume !== undefined) {
                        audioEngine.setVolume(padId, updatedPad.volume, newState.masterVolume);
                    }
                    // Update pan if changed
                    if (updates.pan !== undefined) {
                        audioEngine.setPan(padId, updatedPad.pan);
                    }
                    // For pitch, attack, release, playback mode changes, restart playback
                    if (
                        updates.pitch !== undefined ||
                        updates.attack !== undefined ||
                        updates.release !== undefined ||
                        updates.playbackMode !== undefined
                    ) {
                        // Restart playback with new settings
                        if (updatedPad.sampleId) {
                            const audioUrl = `http://localhost:8000/samples/${updatedPad.sampleId}/audio`;
                            audioEngine.stop(padId);
                            audioEngine
                                .play(padId, updatedPad.sampleId, audioUrl, {
                                    volume: updatedPad.volume,
                                    pitch: updatedPad.pitch,
                                    pan: updatedPad.pan,
                                    attack: updatedPad.attack,
                                    release: updatedPad.release,
                                    playbackMode: updatedPad.playbackMode,
                                    masterVolume: newState.masterVolume,
                                })
                                .catch((error) => {
                                    console.error("Failed to restart pad with new settings:", error);
                                });
                        }
                    }
                }

                return newState;
            });
        },
        []
    );

    // Play pad audio using AudioEngine
    const playPad = useCallback(
        async (pad: PadConfig) => {
            if (!pad.sampleId || pad.state === "muted") return;

            // Resume audio context if needed (browser requirement)
            await audioEngine.resume();

            // Handle choke groups
            if (pad.chokeGroup !== null && activeBank) {
                activeBank.pads.forEach((p) => {
                    if (
                        p.chokeGroup === pad.chokeGroup &&
                        p.id !== pad.id &&
                        p.state === "playing"
                    ) {
                        stopPad(p);
                    }
                });
            }

            try {
                const audioUrl = `http://localhost:8000/samples/${pad.sampleId}/audio`;

                // Play using AudioEngine with all parameters
                await audioEngine.play(pad.id, pad.sampleId, audioUrl, {
                    volume: pad.volume,
                    pitch: pad.pitch,
                    pan: pad.pan,
                    attack: pad.attack,
                    release: pad.release,
                    playbackMode: pad.playbackMode,
                    masterVolume: padsState.masterVolume,
                });

                updatePad(pad.id, { state: "playing" });

                // For non-looping modes, update state when playback ends
                if (pad.playbackMode !== "loop" && pad.playbackMode !== "toggle") {
                    // Check periodically if playback has ended
                    const checkEnded = setInterval(() => {
                        if (!audioEngine.isPlaying(pad.id)) {
                            updatePad(pad.id, { state: "loaded" });
                            clearInterval(checkEnded);
                        }
                    }, 100);
                }
            } catch (error) {
                console.error("Failed to play pad:", error);
                updatePad(pad.id, { state: "loaded" });
            }
        },
        [activeBank, padsState.masterVolume, updatePad]
    );

    // Stop pad audio using AudioEngine
    const stopPad = useCallback(
        (pad: PadConfig) => {
            audioEngine.stop(pad.id, pad.release);
            updatePad(pad.id, { state: "loaded" });
        },
        [updatePad]
    );

    // Handle pad click (for selection and toggle mode)
    const handlePadClick = useCallback(
        (pad: PadConfig) => {
            // Always select the pad
            setSelectedPadId(pad.id);

            if (pad.state === "empty") {
                return;
            }

            // For gate mode, don't trigger on click (use mouse/touch down/up instead)
            if (pad.playbackMode === "gate") {
                return;
            }

            if (pad.playbackMode === "toggle") {
                if (pad.state === "playing") {
                    stopPad(pad);
                } else {
                    playPad(pad);
                }
            } else {
                // One-shot, loop, reverse
                if (pad.state === "playing") {
                    stopPad(pad);
                } else {
                    playPad(pad);
                }
            }
        },
        [playPad, stopPad]
    );

    // Handle pad mouse down (for gate mode)
    const handlePadMouseDown = useCallback(
        (pad: PadConfig) => {
            if (pad.state === "empty" || pad.playbackMode !== "gate") return;
            playPad(pad);
        },
        [playPad]
    );

    // Handle pad mouse up (for gate mode)
    const handlePadMouseUp = useCallback(
        (pad: PadConfig) => {
            if (pad.state === "empty" || pad.playbackMode !== "gate") return;
            if (pad.state === "playing") {
                stopPad(pad);
            }
        },
        [stopPad]
    );

    // Handle pad touch start (for gate mode and touch support)
    const handlePadTouchStart = useCallback(
        (pad: PadConfig) => {
            if (pad.state === "empty") {
                setSelectedPadId(pad.id);
                return;
            }

            if (pad.playbackMode === "gate") {
                playPad(pad);
            } else {
                handlePadClick(pad);
            }
        },
        [playPad, handlePadClick]
    );

    // Handle pad touch end (for gate mode)
    const handlePadTouchEnd = useCallback(
        (pad: PadConfig) => {
            if (pad.state === "empty" || pad.playbackMode !== "gate") return;
            if (pad.state === "playing") {
                stopPad(pad);
            }
        },
        [stopPad]
    );

    // Handle keyboard events
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!activeBank) return;

            const pad = activeBank.pads.find((p) => p.keyboardKey === e.key.toLowerCase());
            if (pad && pad.state !== "empty") {
                e.preventDefault();
                if (pad.playbackMode === "gate") {
                    playPad(pad);
                } else {
                    handlePadClick(pad);
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (!activeBank) return;

            const pad = activeBank.pads.find((p) => p.keyboardKey === e.key.toLowerCase());
            if (pad && pad.playbackMode === "gate" && pad.state === "playing") {
                e.preventDefault();
                stopPad(pad);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, [activeBank, playPad, stopPad, handlePadClick]);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            audioEngine.stopAll();
        };
    }, []);

    // Assign sample to pad
    const assignSampleToPad = useCallback(
        (padId: string, sample: Sample) => {
            updatePad(padId, {
                sampleId: sample.id,
                sampleName: sample.name,
                state: "loaded",
            });
        },
        [updatePad]
    );

    // Clear pad
    const clearPad = useCallback(
        (padId: string) => {
            const audio = audioRefs.current.get(padId);
            if (audio) {
                audio.pause();
                audioRefs.current.delete(padId);
            }
            updatePad(padId, {
                sampleId: null,
                sampleName: null,
                state: "empty",
            });
        },
        [updatePad]
    );

    // Handle sample drop on pad
    const handlePadDrop = useCallback(
        (padId: string) => {
            if (draggedSample) {
                assignSampleToPad(padId, draggedSample);
                setDraggedSample(null);
            }
        },
        [draggedSample, assignSampleToPad]
    );

    // Switch bank
    const switchBank = useCallback((bankId: string) => {
        setPadsState((prev) => ({ ...prev, activeBankId: bankId }));
        setSelectedPadId(null);
    }, []);

    // Handle master volume change
    const handleMasterVolumeChange = useCallback((value: number) => {
        setPadsState((prev) => {
            const newState = { ...prev, masterVolume: value };

            // Update volume for all currently playing pads in the active bank
            const activeBank = newState.banks.find((b) => b.id === newState.activeBankId);
            if (activeBank) {
                activeBank.pads.forEach((pad) => {
                    if (audioEngine.isPlaying(pad.id)) {
                        audioEngine.setVolume(pad.id, pad.volume, value);
                    }
                });
            }

            return newState;
        });
    }, []);

    // Copy bank
    const copyBank = useCallback((sourceBankId: string, targetBankId: string) => {
        setPadsState((prev) => {
            const sourceBank = prev.banks.find((b) => b.id === sourceBankId);
            if (!sourceBank) return prev;

            return {
                ...prev,
                banks: prev.banks.map((bank) =>
                    bank.id === targetBankId
                        ? {
                              ...bank,
                              pads: sourceBank.pads.map((pad) => ({
                                  ...pad,
                                  id: `${targetBankId}-${pad.id.split("-").pop()}`,
                                  state: pad.state === "playing" ? "loaded" : pad.state,
                              })),
                          }
                        : bank
                ),
            };
        });
    }, []);

    // Get pad visual state
    if (!activeBank) return null;

    return (
        <div className="flex h-full flex-col space-y-5 overflow-y-auto p-4">
            {/* Master Controls */}
            <MasterControls
                masterVolume={padsState.masterVolume}
                quantizeEnabled={padsState.quantizeEnabled}
                onMasterVolumeChange={handleMasterVolumeChange}
                onQuantizeToggle={() =>
                    setPadsState((prev) => ({ ...prev, quantizeEnabled: !prev.quantizeEnabled }))
                }
            />

            {/* Bank Controls */}
            <BankControls
                banks={padsState.banks}
                activeBankId={padsState.activeBankId}
                onBankChange={switchBank}
                onCopyBank={copyBank}
            />

            {/* Pad Grid */}
            <div className="space-y-3">
                <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.15em] uppercase">
                    <Grid3x3 className="h-3.5 w-3.5" />
                    Pads - Bank {activeBank.name}
                </div>
                <div className="bg-secondary/5 border-secondary/10 rounded-lg border p-4">
                    <PadGrid
                        pads={activeBank.pads}
                        selectedPadId={selectedPadId}
                        draggedSample={draggedSample}
                        onPadClick={handlePadClick}
                        onPadMouseDown={handlePadMouseDown}
                        onPadMouseUp={handlePadMouseUp}
                        onPadTouchStart={handlePadTouchStart}
                        onPadTouchEnd={handlePadTouchEnd}
                        onPadDrop={handlePadDrop}
                        onPadDragOver={(e) => e.preventDefault()}
                    />
                </div>
            </div>

            {/* Pad Editor */}
            {selectedPad && (
                <PadEditor
                    pad={selectedPad}
                    onUpdate={updatePad}
                    onClear={clearPad}
                />
            )}

            {/* Sample Library */}
            <SampleLibrary
                samples={samples}
                selectedPad={selectedPad}
                activePads={activeBank.pads}
                onDragStart={setDraggedSample}
                onDragEnd={() => setDraggedSample(null)}
                onAssignSample={(sample) => {
                    const targetPad = selectedPad || activeBank.pads.find((p) => p.state === "empty");
                    if (targetPad) {
                        assignSampleToPad(targetPad.id, sample);
                    }
                }}
            />
        </div>
    );
}

