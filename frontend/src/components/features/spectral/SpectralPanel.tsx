import { Panel } from "@/components/ui/panel";

export function SpectralPanel() {
    return (
        <Panel title="SPECTRAL" className="flex flex-col">
            <div className="flex-1 p-4">
                <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-primary mb-2">
                            Spectral Panel
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Spectral Analysis • Features • Harmonics
                        </p>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

