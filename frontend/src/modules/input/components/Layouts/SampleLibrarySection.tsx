/**
 * SampleLibrarySection Layout Component
 *
 * REFACTORED: Pure layout component using Zustand best practices
 * - Reads samples from Zustand store
 * - Calls sample actions directly from store
 * - Only manages local UI state (search, category filter, edit mode, playback)
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useDAWStore } from '@/stores/dawStore';
import { SampleLibraryBrowser } from "../SampleLibraryBrowser.tsx";
import type { SampleMetadata } from "@/services/api/providers";
import { toast } from "sonner";

export function SampleLibrarySection() {
    // ========================================================================
    // STATE: Read from Zustand store
    // ========================================================================
    const samples = useDAWStore(state => state.samples);

    // ========================================================================
    // ACTIONS: Get from Zustand store
    // ========================================================================
    const loadSamples = useDAWStore(state => state.loadSamples);
    const uploadSample = useDAWStore(state => state.uploadSample);
    const updateSample = useDAWStore(state => state.updateSample);
    const deleteSample = useDAWStore(state => state.deleteSample);

    // ========================================================================
    // LOCAL STATE: UI state for search, filtering, editing, and playback
    // ========================================================================
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [isUploading, setIsUploading] = useState(false);
    const [editingSampleId, setEditingSampleId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editCategory, setEditCategory] = useState("");

    // Playback refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // Load samples on mount
    useEffect(() => {
        loadSamples();
    }, [loadSamples]);

    // ========================================================================
    // HANDLERS: Local UI logic
    // ========================================================================

    // Handle file upload
    const handleFileUpload = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (!files) return;

            setIsUploading(true);
            try {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (!file.type.startsWith("audio/")) {
                        console.warn(`${file.name} is not an audio file`);
                        continue;
                    }

                    const name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
                    await uploadSample(file, name, selectedCategory === "All" ? "Uncategorized" : selectedCategory);
                }
            } finally {
                setIsUploading(false);
                // Reset input
                event.target.value = "";
            }
        },
        [uploadSample, selectedCategory]
    );

    // Start editing sample
    const handleStartEdit = useCallback((sample: SampleMetadata) => {
        setEditingSampleId(sample.id);
        setEditName(sample.name);
        setEditCategory(sample.category);
    }, []);

    // Save sample edits
    const handleSaveEdit = useCallback(async () => {
        if (!editingSampleId) return;

        try {
            await updateSample(editingSampleId, editName, editCategory);
            setEditingSampleId(null);
        } catch (error) {
            console.error("Failed to update sample:", error);
        }
    }, [editingSampleId, editName, editCategory, updateSample]);

    // Cancel editing
    const handleCancelEdit = useCallback(() => {
        setEditingSampleId(null);
        setEditName("");
        setEditCategory("");
    }, []);

    // Delete sample
    const handleDeleteSample = useCallback(async (sampleId: string) => {
        try {
            await deleteSample(sampleId);
        } catch (error) {
            console.error("Failed to delete sample:", error);
        }
    }, [deleteSample]);

    // Play sample preview
    const handlePlaySample = useCallback(async (sampleId: string) => {
        try {
            // Stop current playback
            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
                audioSourceRef.current = null;
            }

            // Create audio context if needed
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }

            // Fetch and decode audio
            const url = `/api/samples/${sampleId}/download`;
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

            // Create and play source
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);

            source.onended = () => {
                audioSourceRef.current = null;
            };

            source.start();
            audioSourceRef.current = source;
        } catch (error) {
            console.error("Failed to play sample:", error);
            toast.error("Failed to play sample");
        }
    }, []);

    // Handle sample drag start
    const handleSampleDragStart = useCallback((sampleId: string) => {
        console.log("Drag sample:", sampleId);
        // TODO: Implement drag to sequencer/loop
    }, []);

    return (
        <SampleLibraryBrowser
            samples={samples}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            isUploading={isUploading}
            onFileUpload={handleFileUpload}
            editingSampleId={editingSampleId}
            editName={editName}
            editCategory={editCategory}
            onEditNameChange={setEditName}
            onEditCategoryChange={setEditCategory}
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onPlaySample={handlePlaySample}
            onDeleteSample={handleDeleteSample}
            onSampleDragStart={handleSampleDragStart}
        />
    );
}

