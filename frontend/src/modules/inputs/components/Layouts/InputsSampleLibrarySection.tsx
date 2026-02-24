/**
 * InputsSampleLibrarySection Component
 * 
 * Container component that composes sample library hook with presentation components.
 * Handles sample browsing, upload, editing, deletion, and playback.
 */

import { useState } from "react";
import { useSampleLibrary } from "../../hooks/useSampleLibrary";
import { InputsSampleLibrary } from "../InputsSampleLibrary";

export function InputsSampleLibrarySection() {
    // Search and filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    // Use sample library hook
    const {
        samples,
        isUploading,
        editingSampleId,
        editName,
        editCategory,
        playingSampleId,
        handleUploadSample,
        handleStartEdit,
        handleSaveEdit,
        handleCancelEdit,
        handleDeleteSample,
        handlePlaySample,
        setEditName,
        setEditCategory,
    } = useSampleLibrary();

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        // Upload each file
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const name = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
            await handleUploadSample(file, name, "Uncategorized");
        }

        // Clear input
        event.target.value = "";
    };

    // Handle sample drag start (for drag-and-drop to sequencer)
    const handleSampleDragStart = (sampleId: string) => {
        // Store sample ID in drag data
        const sample = samples.find(s => s.id === sampleId);
        if (sample) {
            console.log("Dragging sample:", sample.name);
            // TODO: Implement drag-and-drop to sequencer
        }
    };

    // Stop playing sample when switching categories or searching
    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        if (playingSampleId) {
            // Audio will stop automatically when component unmounts
        }
    };

    return (
        <InputsSampleLibrary
            samples={samples}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
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

