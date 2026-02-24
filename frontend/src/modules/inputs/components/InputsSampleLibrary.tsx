/**
 * InputsSampleLibrary Component
 * 
 * Pure presentation component for sample library browsing.
 * Displays search, upload, categories, and sample list with edit/delete/play actions.
 */

import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Search, Upload, Music, Play, Edit2, Trash2 } from "lucide-react";
import type { SampleMetadata } from "@/services/api/providers";

const SAMPLE_CATEGORIES = [
    "All",
    "Uncategorized",
    "Drums",
    "Bass",
    "Synth",
    "Vocals",
    "FX",
    "Loops",
];

interface SampleLibraryBrowserProps {
    // Sample data
    samples: SampleMetadata[];
    
    // Search & filter
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedCategory: string;
    onCategoryChange: (category: string) => void;
    
    // Upload
    isUploading: boolean;
    onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    
    // Edit mode
    editingSampleId: string | null;
    editName: string;
    editCategory: string;
    onEditNameChange: (name: string) => void;
    onEditCategoryChange: (category: string) => void;
    onStartEdit: (sample: SampleMetadata) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    
    // Actions
    onPlaySample: (sampleId: string) => void;
    onDeleteSample: (sampleId: string) => void;
    onSampleDragStart: (sampleId: string) => void;
}

export function InputsSampleLibrary({
    samples,
    searchQuery,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
    isUploading,
    onFileUpload,
    editingSampleId,
    editName,
    editCategory,
    onEditNameChange,
    onEditCategoryChange,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onPlaySample,
    onDeleteSample,
    onSampleDragStart,
}: SampleLibraryBrowserProps) {
    // Filter samples
    const filteredSamples = samples.filter((sample) => {
        const matchesCategory = selectedCategory === "All" || sample.category === selectedCategory;
        const matchesSearch = sample.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <>
            <SubPanel title="Search" collapsible>
                <div className="space-y-2 p-2">
                    <div className="relative">
                        <Search
                            className="text-muted-foreground absolute top-1/2 left-2 z-10 -translate-y-1/2"
                            size={14}
                        />
                        <Input
                            type="text"
                            placeholder="Search samples..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="h-8 w-full pl-8 text-xs"
                        />
                    </div>
                    <Button
                        onClick={() => document.getElementById("file-upload-input")?.click()}
                        variant="default"
                        size="sm"
                        className="w-full"
                        disabled={isUploading}
                    >
                        <Upload size={12} />
                        {isUploading ? "UPLOADING..." : "UPLOAD FILES"}
                    </Button>
                    <input
                        id="file-upload-input"
                        type="file"
                        multiple
                        accept="audio/*"
                        onChange={onFileUpload}
                        className="hidden"
                    />
                </div>
            </SubPanel>

            <SubPanel title="Categories" collapsible>
                <div className="flex flex-wrap gap-1 p-2">
                    {SAMPLE_CATEGORIES.map((cat) => (
                        <Button
                            key={cat}
                            onClick={() => onCategoryChange(cat)}
                            variant={selectedCategory === cat ? "default" : "ghost"}
                            size="xs"
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </SubPanel>

            <SubPanel title={`Samples (${filteredSamples.length})`} collapsible>
                <div className="divide-border divide-y">
                    {filteredSamples.length === 0 && (
                        <div className="text-muted-foreground p-4 text-center text-xs">
                            No samples. Upload audio files to get started.
                        </div>
                    )}
                    {filteredSamples.map((sample) => (
                        <div key={sample.id} className="hover:bg-muted/50 group p-2 transition-colors">
                            {editingSampleId === sample.id ? (
                                // Edit mode
                                <div className="space-y-2">
                                    <Input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => onEditNameChange(e.target.value)}
                                        className="w-full"
                                        placeholder="Sample name"
                                    />
                                    <Select value={editCategory} onValueChange={onEditCategoryChange}>
                                        <SelectTrigger className="h-8 w-full text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SAMPLE_CATEGORIES.filter((c) => c !== "All").map((cat) => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <div className="flex gap-1">
                                        <Button
                                            onClick={onSaveEdit}
                                            variant="default"
                                            size="xs"
                                            className="flex-1"
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            onClick={onCancelEdit}
                                            variant="ghost"
                                            size="xs"
                                            className="flex-1"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                // View mode - continued in next section due to line limit
                                <div className="flex items-center gap-2">
                                    <Music size={14} className="text-muted-foreground flex-shrink-0" />
                                    <div
                                        className="min-w-0 flex-1 cursor-move"
                                        draggable
                                        onDragStart={() => onSampleDragStart(sample.id)}
                                    >
                                        <div className="truncate text-xs">{sample.name}</div>
                                        <div className="text-muted-foreground text-[10px]">
                                            {sample.category} •{" "}
                                            {sample.duration > 0 ? `${sample.duration.toFixed(1)}s` : ""}
                                            {sample.duration > 0 ? " • " : ""}
                                            {(sample.size / 1024 / 1024).toFixed(2)} MB
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <Button
                                            onClick={() => onPlaySample(sample.id)}
                                            variant="ghost"
                                            size="icon-xs"
                                            title="Play"
                                        >
                                            <Play size={12} className="text-muted-foreground" />
                                        </Button>
                                        <Button
                                            onClick={() => onStartEdit(sample)}
                                            variant="ghost"
                                            size="icon-xs"
                                            title="Edit"
                                        >
                                            <Edit2 size={12} className="text-muted-foreground" />
                                        </Button>
                                        <Button
                                            onClick={() => onDeleteSample(sample.id)}
                                            variant="ghost"
                                            size="icon-xs"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} className="text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </SubPanel>
        </>
    );
}

