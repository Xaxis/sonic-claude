/**
 * AudioInputControls Component
 * 
 * Pure presentation component for audio input controls.
 * Displays device selector, spectrum analyzer, level meter, gain control, and recording button.
 */

import { SubPanel } from "@/components/ui/sub-panel.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Toggle } from "@/components/ui/toggle.tsx";
import type { AudioDeviceInfo } from "../hooks/useAudioInput.ts";

interface AudioInputControlsProps {
    // Device state
    audioInputDevices: AudioDeviceInfo[];
    selectedInputDevice: string;
    onDeviceChange: (deviceId: string) => void;
    
    // Monitoring state
    isMonitoring: boolean;
    onMonitoringChange: (enabled: boolean) => void;
    
    // Level & spectrum
    inputLevel: number;
    spectrumData: number[];
    
    // Gain control
    gain: number;
    onGainChange: (gain: number) => void;
    
    // Recording
    isRecording: boolean;
    onStartRecording: () => void;
}

export function AudioInputControls({
    audioInputDevices,
    selectedInputDevice,
    onDeviceChange,
    isMonitoring,
    onMonitoringChange,
    inputLevel,
    spectrumData,
    gain,
    onGainChange,
    isRecording,
    onStartRecording,
}: AudioInputControlsProps) {
    return (
        <>
            <SubPanel title="Input Device" collapsible>
                <div className="p-2">
                    <Select value={selectedInputDevice} onValueChange={onDeviceChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue
                                placeholder={
                                    audioInputDevices.length === 0
                                        ? "No input devices"
                                        : "Select input device..."
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {audioInputDevices.map((device) => (
                                <SelectItem key={device.deviceId} value={device.deviceId}>
                                    {device.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </SubPanel>

            <SubPanel title="Spectrum" collapsible>
                <div className="p-2">
                    <div className="flex h-16 items-end gap-0.5">
                        {spectrumData.map((value, i) => (
                            <div
                                key={i}
                                className="flex-1 rounded-t transition-all duration-75"
                                style={{
                                    height: `${value * 100}%`,
                                    backgroundColor:
                                        value > 0.8
                                            ? "hsl(0 85% 60%)"
                                            : value > 0.5
                                              ? "hsl(45 95% 60%)"
                                              : "hsl(187 85% 55%)",
                                    boxShadow:
                                        value > 0.5
                                            ? `0 0 8px ${value > 0.8 ? "rgba(239, 68, 68, 0.5)" : "rgba(250, 204, 21, 0.5)"}`
                                            : "0 0 6px rgba(0, 245, 255, 0.3)",
                                    minHeight: "2px",
                                }}
                            />
                        ))}
                    </div>
                </div>
            </SubPanel>

            <SubPanel title="Input Level" collapsible>
                <div className="space-y-2 p-2">
                    <div className="flex items-center gap-2">
                        <div className="bg-background border-border h-4 flex-1 overflow-hidden rounded border">
                            {/* Level meter - cyan to yellow to red */}
                            <div
                                className="h-full transition-all duration-75"
                                style={{
                                    width: `${Math.max(0, Math.min(100, ((inputLevel + 60) / 60) * 100))}%`,
                                    backgroundColor:
                                        inputLevel > -6
                                            ? "hsl(0 85% 60%)"
                                            : inputLevel > -12
                                              ? "hsl(45 95% 60%)"
                                              : "hsl(187 85% 55%)",
                                    boxShadow:
                                        inputLevel > -12
                                            ? `0 0 10px ${inputLevel > -6 ? "rgba(239, 68, 68, 0.5)" : "rgba(250, 204, 21, 0.5)"}`
                                            : "0 0 8px rgba(0, 245, 255, 0.3)",
                                }}
                            />
                        </div>
                        <Label className="w-14 text-right text-xs">
                            {inputLevel.toFixed(1)} dB
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="w-10 text-xs">Gain:</Label>
                        <Slider
                            min={-20}
                            max={20}
                            step={0.5}
                            value={[gain]}
                            onValueChange={(values) => onGainChange(values[0])}
                            className="flex-1"
                        />
                        <Label className="w-14 text-right text-xs">
                            {gain > 0 ? "+" : ""}
                            {gain.toFixed(1)} dB
                        </Label>
                    </div>
                </div>
            </SubPanel>

            <SubPanel title="Controls" collapsible>
                <div className="space-y-2 p-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs">MONITOR</Label>
                        <Toggle checked={isMonitoring} onCheckedChange={onMonitoringChange} />
                    </div>
                    <Button
                        onClick={onStartRecording}
                        variant={isRecording ? "destructive" : "default"}
                        size="sm"
                        className="w-full"
                    >
                        <div
                            className={`h-2 w-2 rounded-full ${isRecording ? "animate-pulse bg-white" : "bg-red-500"}`}
                        />
                        {isRecording ? "STOP" : "REC"}
                    </Button>
                </div>
            </SubPanel>
        </>
    );
}

