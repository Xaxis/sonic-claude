/**
 * InputsAudioInputSection Component
 * 
 * Container component that composes audio input hook with presentation components.
 * Handles audio device selection, monitoring, recording, and spectrum visualization.
 */

import { useAudioInput } from "../../hooks/useAudioInput";
import { InputsAudioControls } from "../InputsAudioControls";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useDAWStore } from "@/stores/dawStore";

export function InputsAudioInputSection() {
    // Get action from store to switch tabs
    const setActiveInputsTab = useDAWStore(state => state.setActiveInputsTab);

    // Handle recording completion - upload to backend
    const handleRecordingComplete = async (file: File, _duration: number) => {
        try {
            // Generate name from timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const name = `Recording ${timestamp}`;
            
            // Upload to backend
            await api.samples.upload(file, name, "Recordings");
            
            toast.success(`Recording saved: ${name}`);
            
            // Switch to library tab to show the new recording
            setActiveInputsTab("library");
        } catch (error) {
            console.error("Failed to save recording:", error);
            toast.error("Failed to save recording");
        }
    };

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
        <InputsAudioControls
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

