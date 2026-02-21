/**
 * EffectsMasterSection - Master effects column component
 *
 * Displays master bus effects chain.
 * Matches MixerMasterSection width (w-56) for 1:1 alignment.
 *
 * TODO: Master effect chain support not yet implemented in backend/EffectsContext
 */

export function EffectsMasterSection() {
    return (
        <div className="flex w-56 flex-shrink-0 flex-col gap-3 rounded-lg border-2 border-primary/50 bg-gradient-to-b from-primary/10 to-primary/5 p-3 shadow-lg">
            {/* Master Header */}
            <div className="flex flex-col gap-1.5 border-b border-primary/30 pb-2.5">
                {/* Master Label */}
                <div className="truncate text-center text-xs font-bold uppercase tracking-wider text-primary drop-shadow-sm">
                    Master
                </div>

                {/* Master Badge */}
                <div className="flex justify-center">
                    <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary shadow-sm border border-primary/40">
                        FX CHAIN
                    </span>
                </div>
            </div>

            {/* Placeholder - Master effects not yet implemented */}
            <div className="flex flex-1 items-center justify-center">
                <div className="text-center space-y-2">
                    <div className="text-2xl opacity-20">⚡</div>
                    <p className="text-[9px] text-muted-foreground">
                        Master Effects
                    </p>
                    <p className="text-[8px] text-muted-foreground/60">
                        Coming Soon
                    </p>
                </div>
            </div>
        </div>
    );
}

