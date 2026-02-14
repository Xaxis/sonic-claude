/**
 * useSampleLibrary Hook
 * 
 * Manages sample library operations: upload, browse, edit, delete, and playback.
 * Handles communication with backend sample storage API.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/services/api";
import type { SampleMetadata } from "@/services/samples";
import { toast } from "sonner";

interface UseSampleLibraryProps {
    onSampleSelect?: (sample: SampleMetadata) => void;
}

export function useSampleLibrary({ onSampleSelect }: UseSampleLibraryProps = {}) {
    // Sample library state
    const [samples, setSamples] = useState<SampleMetadata[]>([]);
    const [selectedSample, setSelectedSample] = useState<SampleMetadata | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [editingSampleId, setEditingSampleId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editCategory, setEditCategory] = useState("");
    
    // Playback state
    const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // Load all samples from backend
    const loadSamples = useCallback(async () => {
        try {
            const loadedSamples = await api.samples.getAll();
            setSamples(loadedSamples);
            console.log(`✅ Loaded ${loadedSamples.length} samples`);
        } catch (error) {
            console.error("Failed to load samples:", error);
            toast.error("Failed to load samples");
        }
    }, []);

    // Load samples on mount
    useEffect(() => {
        loadSamples();
    }, [loadSamples]);

    // Handle sample upload
    const handleUploadSample = useCallback(async (file: File, name: string, category: string = "Uncategorized") => {
        setIsUploading(true);
        try {
            const uploadedSample = await api.samples.upload(file, name, category);

            // Update duration after upload
            const audio = new Audio(api.samples.getDownloadUrl(uploadedSample.id));
            audio.addEventListener("loadedmetadata", async () => {
                const duration = audio.duration;
                await api.samples.updateDuration(uploadedSample.id, duration);
                await loadSamples(); // Reload to get updated duration
            });
            
            toast.success(`Sample "${name}" uploaded successfully`);
            await loadSamples();
        } catch (error) {
            console.error("Failed to upload sample:", error);
            toast.error("Failed to upload sample");
        } finally {
            setIsUploading(false);
        }
    }, [loadSamples]);

    // Handle sample selection
    const handleSelectSample = useCallback((sample: SampleMetadata) => {
        setSelectedSample(sample);
        if (onSampleSelect) {
            onSampleSelect(sample);
        }
    }, [onSampleSelect]);

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
            await sampleApi.updateSample(editingSampleId, {
                name: editName,
                category: editCategory,
            });
            
            toast.success("Sample updated successfully");
            setEditingSampleId(null);
            await loadSamples();
        } catch (error) {
            console.error("Failed to update sample:", error);
            toast.error("Failed to update sample");
        }
    }, [editingSampleId, editName, editCategory, loadSamples]);

    // Cancel editing
    const handleCancelEdit = useCallback(() => {
        setEditingSampleId(null);
        setEditName("");
        setEditCategory("");
    }, []);

    // Delete sample
    const handleDeleteSample = useCallback(async (sampleId: string) => {
        try {
            await sampleApi.deleteSample(sampleId);
            toast.success("Sample deleted successfully");
            await loadSamples();
            
            if (selectedSample?.id === sampleId) {
                setSelectedSample(null);
            }
        } catch (error: any) {
            console.error("Failed to delete sample:", error);
            toast.error(error.message || "Failed to delete sample");
        }
    }, [loadSamples, selectedSample]);

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
            const url = api.samples.getDownloadUrl(sampleId);
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

            // Create and play source
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            
            source.onended = () => {
                setPlayingSampleId(null);
                audioSourceRef.current = null;
            };

            source.start();
            audioSourceRef.current = source;
            setPlayingSampleId(sampleId);
        } catch (error) {
            console.error("Failed to play sample:", error);
            toast.error("Failed to play sample");
            setPlayingSampleId(null);
        }
    }, []);

    return {
        // State
        samples,
        selectedSample,
        isUploading,
        editingSampleId,
        editName,
        editCategory,
        playingSampleId,
        
        // Actions
        loadSamples,
        handleUploadSample,
        handleSelectSample,
        handleStartEdit,
        handleSaveEdit,
        handleCancelEdit,
        handleDeleteSample,
        handlePlaySample,
        setEditName,
        setEditCategory,
    };
}

