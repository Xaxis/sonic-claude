/**
 * Sequencer Panel Sample Browser
 *
 * Allows users to select samples from the sample library when creating tracks
 */

import { useState, useEffect } from "react";
import { X, Search, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { cn } from "@/lib/utils.ts";
import { api } from "@/services/api";
import type { SampleMetadata } from "@/services/samples";

interface SequencerSampleBrowserProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectSample: (sample: SampleMetadata) => void;
}

export function SequencerSampleBrowser({ isOpen, onClose, onSelectSample }: SequencerSampleBrowserProps) {
    const [samples, setSamples] = useState<SampleMetadata[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSample, setSelectedSample] = useState<SampleMetadata | null>(null);
    const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

    // Load samples on mount
    useEffect(() => {
        if (isOpen) {
            loadSamples();
        }
    }, [isOpen]);

    const loadSamples = async () => {
        try {
            const samplesData = await api.samples.getAll();
            setSamples(samplesData);
        } catch (error) {
            console.error("Failed to load samples:", error);
        }
    };

    const filteredSamples = samples.filter(sample =>
        sample.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sample.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handlePlaySample = (sample: sampleApi.SampleMetadata) => {
        if (playingSampleId === sample.id) {
            // Stop playing
            audioElement?.pause();
            setPlayingSampleId(null);
        } else {
            // Start playing
            if (audioElement) {
                audioElement.pause();
            }
            const audio = new Audio(sampleApi.getSampleDownloadUrl(sample.id));
            audio.play();
            audio.onended = () => setPlayingSampleId(null);
            setAudioElement(audio);
            setPlayingSampleId(sample.id);
        }
    };

    const handleSelect = () => {
        if (selectedSample) {
            onSelectSample(selectedSample);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-background border-border w-full max-w-2xl rounded-lg border shadow-lg">
                {/* Header */}
                <div className="border-border flex items-center justify-between border-b p-4">
                    <Label className="text-lg font-bold">Select Sample</Label>
                    <Button onClick={onClose} variant="ghost" size="icon-xs">
                        <X size={16} />
                    </Button>
                </div>

                {/* Search */}
                <div className="border-border border-b p-4">
                    <div className="relative">
                        <Search className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" size={16} />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search samples..."
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Sample List */}
                <div className="max-h-96 overflow-y-auto p-4">
                    {filteredSamples.length === 0 ? (
                        <div className="text-muted-foreground py-8 text-center">
                            <Label>No samples found</Label>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredSamples.map((sample) => (
                                <div
                                    key={sample.id}
                                    onClick={() => setSelectedSample(sample)}
                                    className={cn(
                                        "border-border hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded border p-3 transition-colors",
                                        selectedSample?.id === sample.id && "bg-muted border-primary"
                                    )}
                                >
                                    <div className="flex-1">
                                        <Label className="font-mono text-sm">{sample.name}</Label>
                                        <div className="text-muted-foreground mt-1 flex gap-3 text-xs">
                                            <span>{sample.category}</span>
                                            <span>•</span>
                                            <span>{sample.duration.toFixed(2)}s</span>
                                            <span>•</span>
                                            <span>{(sample.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePlaySample(sample);
                                        }}
                                        variant="ghost"
                                        size="icon-xs"
                                    >
                                        {playingSampleId === sample.id ? <Pause size={14} /> : <Play size={14} />}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-border flex justify-end gap-2 border-t p-4">
                    <Button onClick={onClose} variant="outline">
                        Cancel
                    </Button>
                    <Button onClick={handleSelect} disabled={!selectedSample}>
                        Select Sample
                    </Button>
                </div>
            </div>
        </div>
    );
}

