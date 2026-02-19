/**
 * CompositionProviderWrapper
 * Wraps CompositionProvider and connects it to AudioEngineContext
 */

import { ReactNode } from "react";
import { CompositionProvider } from "./CompositionContext";
import { useAudioEngine } from "./AudioEngineContext";

export function CompositionProviderWrapper({ children }: { children: ReactNode }) {
    const { activeSequenceId } = useAudioEngine();

    return (
        <CompositionProvider sequenceId={activeSequenceId} autosaveIntervalSeconds={60}>
            {children}
        </CompositionProvider>
    );
}

