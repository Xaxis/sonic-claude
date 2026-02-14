/**
 * SampleLibrarySection Layout Component
 * 
 * Smart container that connects useSampleLibrary hook with SampleLibraryBrowser presentation component.
 * Handles search, filtering, and sample management.
 */

import { useState, useCallback } from "react";
import { useSampleLibrary } from "../hooks/useSampleLibrary.ts";
import { SampleLibraryBrowser } from "../components/SampleLibraryBrowser.tsx";
import type { SampleMetadata } from "@/services/samples";

interface SampleLibrarySectionProps {
    onSampleSelect?: (sample: SampleMetadata) => void;
}

export function SampleLibrarySection({ onSampleSelect }: SampleLibrarySectionProps) {
    // Local UI state for search and filtering
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    // Use sample library hook
    const {
        samples,
        isUploading,
        editingSampleId,
        editName,
        editCategory,
        handleUploadSample,
        handleSelectSample,
        handleStartEdit,
        handleSaveEdit,
        handleCancelEdit,
        handleDeleteSample,
        handlePlaySample,
        setEditName,
        setEditCategory,
    } = useSampleLibrary({ onSampleSelect });

    // Handle file upload
    const handleFileUpload = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (!files) return;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (!file.type.startsWith("audio/")) {
                    console.warn(`${file.name} is not an audio file`);
                    continue;
                }

                const name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
                await handleUploadSample(file, name, "Uncategorized");
            }

            // Reset input
            event.target.value = "";
        },
        [handleUploadSample]
    );

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

