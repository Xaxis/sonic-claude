import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";

interface HarmonyProps {
    currentKey: string;
    currentScale: string;
    onKeyChange: (key: string) => void;
    onScaleChange: (scale: string) => void;
}

const KEYS = ["A", "B", "C", "D", "E", "F", "G"];
const SCALES = ["Major", "Minor", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Pentatonic"];

export function Harmony({ currentKey, currentScale, onKeyChange, onScaleChange }: HarmonyProps) {
    const handleKeyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const key = e.target.value;
        onKeyChange(key);
        try {
            await api.setKey(key.toLowerCase());
        } catch (err) {
            console.error("Failed to set key:", err);
        }
    };

    const handleScaleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const scale = e.target.value;
        onScaleChange(scale);
        try {
            await api.setScale(scale.toLowerCase());
        } catch (err) {
            console.error("Failed to set scale:", err);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>HARMONY</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-muted-foreground text-xs tracking-[0.15em]">
                            KEY
                        </label>
                        <Select value={currentKey} onChange={handleKeyChange}>
                            {KEYS.map((key) => (
                                <option key={key} value={key}>
                                    {key}
                                </option>
                            ))}
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-muted-foreground text-xs tracking-[0.15em]">
                            SCALE
                        </label>
                        <Select value={currentScale} onChange={handleScaleChange}>
                            {SCALES.map((scale) => (
                                <option key={scale} value={scale}>
                                    {scale}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
