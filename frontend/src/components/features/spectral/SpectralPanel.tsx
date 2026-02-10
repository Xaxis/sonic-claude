import { Panel } from "@/components/ui/panel";

export function SpectralPanel() {
    return (
        <Panel title="SPECTRAL" className="flex flex-col">
            <div className="flex-1 p-4">
                <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                        <h3 className="text-primary mb-2 text-lg font-bold">Spectral Panel</h3>
                        <p className="text-muted-foreground text-sm">
                            Spectral Analysis • Features • Harmonics
                        </p>
                    </div>
                </div>
            </div>
        </Panel>
    );
}
