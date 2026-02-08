import { createContext, useContext, useState, ReactNode } from "react";
import type { SpectralFeatures } from "@/types";

interface AttachedSpectralData {
    sampleName: string;
    sampleId: string;
    features: SpectralFeatures;
    selectedFeatures: {
        spectral: boolean;
        harmonics: boolean;
        envelope: boolean;
        perceptual: boolean;
        fullSpectrum: boolean;
    };
}

interface SpectralDataContextType {
    attachedData: AttachedSpectralData | null;
    attachSpectralData: (data: AttachedSpectralData) => void;
    detachSpectralData: () => void;
    isAttached: boolean;
}

const SpectralDataContext = createContext<SpectralDataContextType | undefined>(undefined);

export function SpectralDataProvider({ children }: { children: ReactNode }) {
    const [attachedData, setAttachedData] = useState<AttachedSpectralData | null>(null);

    const attachSpectralData = (data: AttachedSpectralData) => {
        setAttachedData(data);
        console.log("📎 Spectral data attached to chat:", data.sampleName);
    };

    const detachSpectralData = () => {
        setAttachedData(null);
        console.log("📎 Spectral data detached from chat");
    };

    return (
        <SpectralDataContext.Provider
            value={{
                attachedData,
                attachSpectralData,
                detachSpectralData,
                isAttached: attachedData !== null,
            }}
        >
            {children}
        </SpectralDataContext.Provider>
    );
}

export function useSpectralData() {
    const context = useContext(SpectralDataContext);
    if (context === undefined) {
        throw new Error("useSpectralData must be used within a SpectralDataProvider");
    }
    return context;
}
