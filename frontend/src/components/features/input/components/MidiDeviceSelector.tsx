/**
 * MidiDeviceSelector Component
 * 
 * Pure presentation component for MIDI device selection and settings.
 * Displays device selector, activity monitor, and MIDI settings.
 */

import { SubPanel } from "@/components/ui/sub-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import type { MidiDeviceInfo } from "../hooks/useMidiInput";

interface MidiDeviceSelectorProps {
    // Device state
    midiInputDevices: MidiDeviceInfo[];
    selectedMidiDevice: string;
    onDeviceChange: (deviceId: string) => void;
    
    // Activity
    midiActivity: boolean;
    
    // Settings
    midiThruEnabled: boolean;
    onMidiThruChange: (enabled: boolean) => void;
    quantizeEnabled: boolean;
    onQuantizeChange: (enabled: boolean) => void;
}

export function MidiDeviceSelector({
    midiInputDevices,
    selectedMidiDevice,
    onDeviceChange,
    midiActivity,
    midiThruEnabled,
    onMidiThruChange,
    quantizeEnabled,
    onQuantizeChange,
}: MidiDeviceSelectorProps) {
    return (
        <>
            <SubPanel title="MIDI Device" collapsible>
                <div className="space-y-2 p-2">
                    <Select value={selectedMidiDevice} onValueChange={onDeviceChange}>
                        <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue
                                placeholder={
                                    midiInputDevices.length === 0
                                        ? "No MIDI Devices"
                                        : "Select MIDI device..."
                                }
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {midiInputDevices.length === 0 ? (
                                <SelectItem value="none">No MIDI Devices</SelectItem>
                            ) : (
                                midiInputDevices.map((device) => (
                                    <SelectItem key={device.id} value={device.id}>
                                        {device.name}
                                        {device.manufacturer && ` (${device.manufacturer})`}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </SubPanel>

            <SubPanel title="MIDI Activity" collapsible>
                <div className="space-y-2 p-2">
                    <div className="flex items-center justify-between text-xs">
                        <Label className="text-xs">Status:</Label>
                        <Label className="text-xs">
                            {midiInputDevices.length > 0 ? "Connected" : "No Device"}
                        </Label>
                    </div>
                    <div className="bg-background border-border flex h-8 items-center justify-center rounded border">
                        {midiActivity ? (
                            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                        ) : (
                            <div className="h-2 w-2 rounded-full bg-gray-500" />
                        )}
                    </div>
                </div>
            </SubPanel>

            <SubPanel title="Settings" collapsible>
                <div className="space-y-2 p-2">
                    <div className="flex items-center gap-2">
                        <Label className="text-xs">Channel:</Label>
                        <Select defaultValue="all">
                            <SelectTrigger className="flex-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Channels</SelectItem>
                                {Array.from({ length: 16 }, (_, i) => (
                                    <SelectItem key={i + 1} value={String(i + 1)}>
                                        Channel {i + 1}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-xs">Enable MIDI thru</Label>
                        <Toggle checked={midiThruEnabled} onCheckedChange={onMidiThruChange} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-xs">Quantize input</Label>
                        <Toggle checked={quantizeEnabled} onCheckedChange={onQuantizeChange} />
                    </div>
                </div>
            </SubPanel>
        </>
    );
}

