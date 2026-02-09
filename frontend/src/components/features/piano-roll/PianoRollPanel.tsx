import { Panel } from "@/components/ui/panel";

export function PianoRollPanel() {
    return (
        <Panel title="PIANO ROLL" className="flex flex-col">
            <div className="flex-1 p-4">
                <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-primary mb-2">
                            Piano Roll Panel
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            MIDI Note Editor • Velocity • Automation
                        </p>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

