import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";

interface MasterMixProps {
    intensity: number;
    cutoff: number;
    reverb: number;
    echo: number;
    onIntensityChange: (value: number) => void;
    onCutoffChange: (value: number) => void;
    onReverbChange: (value: number) => void;
    onEchoChange: (value: number) => void;
}

export function MasterMix({
    intensity,
    cutoff,
    reverb,
    echo,
    onIntensityChange,
    onCutoffChange,
    onReverbChange,
    onEchoChange,
}: MasterMixProps) {
    const handleIntensity = async (value: number) => {
        onIntensityChange(value);
        try {
            await api.setIntensity(value);
        } catch (err) {
            console.error("Failed to set intensity:", err);
        }
    };

    const handleCutoff = async (value: number) => {
        onCutoffChange(value);
        try {
            await api.setCutoff(value);
        } catch (err) {
            console.error("Failed to set cutoff:", err);
        }
    };

    const handleReverb = async (value: number) => {
        onReverbChange(value);
        try {
            await api.setReverb(value);
        } catch (err) {
            console.error("Failed to set reverb:", err);
        }
    };

    const handleEcho = async (value: number) => {
        onEchoChange(value);
        try {
            await api.setEcho(value);
        } catch (err) {
            console.error("Failed to set echo:", err);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>MASTER MIX</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-4 gap-6">
                    <VerticalSlider
                        label="INTENSITY"
                        value={intensity}
                        min={0}
                        max={10}
                        step={0.1}
                        onChange={handleIntensity}
                    />
                    <VerticalSlider
                        label="CUTOFF"
                        value={cutoff}
                        min={50}
                        max={130}
                        step={1}
                        onChange={handleCutoff}
                    />
                    <VerticalSlider
                        label="REVERB"
                        value={reverb}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={handleReverb}
                    />
                    <VerticalSlider
                        label="ECHO"
                        value={echo}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={handleEcho}
                    />
                </div>
            </CardContent>
        </Card>
    );
}

interface VerticalSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
}

function VerticalSlider({ label, value, min, max, step, onChange }: VerticalSliderProps) {
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="flex h-40 items-center">
                <Slider
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    onChange={onChange}
                    className="h-full w-1 [writing-mode:vertical-lr]"
                />
            </div>
            <div className="text-center">
                <div className="text-primary text-lg font-bold">
                    {value.toFixed(step < 1 ? 2 : 0)}
                </div>
                <div className="text-muted-foreground mt-1 text-[0.65rem] tracking-[0.15em]">
                    {label}
                </div>
            </div>
        </div>
    );
}
