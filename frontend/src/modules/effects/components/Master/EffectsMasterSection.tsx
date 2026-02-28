/**
 * EffectsMasterSection - Master effects column placeholder
 *
 * Master bus effects chain — not yet implemented in backend.
 * Uses ChannelStrip + ChannelStripHeader to stay visually consistent
 * with MixerMasterSection and EffectsChannelStrip.
 */

import { ChannelStrip }       from "@/components/ui/channel-strip.tsx";
import { ChannelStripHeader } from "@/components/ui/channel-strip-header.tsx";
import { THEME_PRIMARY_HSL }  from "@/config/theme.constants";

export function EffectsMasterSection() {
    return (
        <ChannelStrip variant="master">
            <ChannelStripHeader
                name="Master"
                color={THEME_PRIMARY_HSL}
                label="FX Chain"
            />

            {/* Placeholder — master effects not yet implemented */}
            <div className="flex flex-1 items-center justify-center py-4">
                <div className="text-center space-y-2">
                    <div className="text-2xl opacity-20">⚡</div>
                    <p className="text-[9px] text-muted-foreground">Master Effects</p>
                    <p className="text-[9px] text-muted-foreground/50">Coming Soon</p>
                </div>
            </div>
        </ChannelStrip>
    );
}
