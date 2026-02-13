import { Panel } from "@/components/ui/panel.tsx";

export function TranscriptionPanel() {
    return (
        <Panel title="TRANSCRIPTION" className="flex flex-col">
            <div className="flex-1 p-4">
                <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                        <h3 className="text-primary mb-2 text-lg font-bold">Transcription Panel</h3>
                        <p className="text-muted-foreground text-sm">
                            Live Transcription • Stem Separation • Analysis
                        </p>
                    </div>
                </div>
            </div>
        </Panel>
    );
}
