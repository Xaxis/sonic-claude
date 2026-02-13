/**
 * AudioInputSection Layout Component
 * 
 * Smart container that connects useAudioInput hook with AudioInputControls presentation component.
 * Handles recording completion and sample upload integration.
 */

import { useCallback } from "react";
import { useAudioInput } from "../hooks/useAudioInput.ts";
import { AudioInputControls } from "../components/AudioInputControls.tsx";
import * as sampleApi from "@/services/sampleApi.ts";
import { toast } from "sonner";

interface AudioInputSectionProps {
    onRecordingComplete?: (sampleId: string) => void;
    onSwitchToLibrary?: () => void;
}

export function AudioInputSection({
    onRecordingComplete,
    onSwitchToLibrary,
}: AudioInputSectionProps) {
    // Handle recording completion - upload to backend
    const handleRecordingComplete = useCallback(
        async (file: File, duration: number) => {
            try {
                const name = `Recording ${new Date().toLocaleTimeString()}`;
                
                // Upload to backend
                toast.info("Saving recording...");
                const metadata = await sampleApi.uploadSample(file, name, "Uncategorized");

                // Update duration on backend
                await sampleApi.updateSampleDuration(metadata.id, duration);

                toast.success(`Recording saved: ${name}`);

                // Notify parent
                if (onRecordingComplete) {
                    onRecordingComplete(metadata.id);
                }

                // Switch to library tab to show the new recording
                if (onSwitchToLibrary) {
                    onSwitchToLibrary();
                }
            } catch (error) {
                console.error("Failed to save recording:", error);
                toast.error("Failed to save recording to server");
            }
        },
        [onRecordingComplete, onSwitchToLibrary]
    );

    // Use audio input hook
    const {
        audioInputDevices,
        selectedInputDevice,
        isMonitoring,
        inputLevel,
        gain,
        spectrumData,
        isRecording,
        setSelectedInputDevice,
        setIsMonitoring,
        handleGainChange,
        handleStartRecording,
    } = useAudioInput({ onRecordingComplete: handleRecordingComplete });

    return (
        <AudioInputControls
            audioInputDevices={audioInputDevices}
            selectedInputDevice={selectedInputDevice}
            onDeviceChange={setSelectedInputDevice}
            isMonitoring={isMonitoring}
            onMonitoringChange={setIsMonitoring}
            inputLevel={inputLevel}
            spectrumData={spectrumData}
            gain={gain}
            onGainChange={handleGainChange}
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
        />
    );
}

