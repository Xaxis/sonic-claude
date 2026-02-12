import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { PopoutWindow } from "@/components/layout";
import { LayoutProvider } from "./contexts/LayoutContext";
import { AudioEngineProvider } from "./contexts/AudioEngineContext";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <TooltipProvider delayDuration={300}>
                <ToastProvider>
                    <LayoutProvider>
                        <AudioEngineProvider>
                            <Routes>
                                <Route path="/" element={<App />} />
                                <Route path="/popout" element={<PopoutWindow />} />
                            </Routes>
                        </AudioEngineProvider>
                    </LayoutProvider>
                </ToastProvider>
            </TooltipProvider>
        </BrowserRouter>
    </StrictMode>
);
