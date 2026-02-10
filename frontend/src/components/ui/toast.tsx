import * as React from "react";
import { cn } from "@/lib/utils";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export interface ToastProps {
    id: string;
    type?: "success" | "error" | "info" | "warning";
    message: string;
    duration?: number;
    onClose?: () => void;
}

const toastIcons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
};

const toastStyles = {
    success: "border-primary/50 bg-primary/10 text-primary",
    error: "border-destructive/50 bg-destructive/10 text-destructive",
    info: "border-border bg-card/50 text-foreground",
    warning: "border-yellow-500/50 bg-yellow-500/10 text-yellow-500",
};

export function Toast({ id, type = "info", message, onClose }: ToastProps) {
    const Icon = toastIcons[type];

    return (
        <div
            className={cn(
                "pointer-events-auto flex items-center gap-3 rounded-md border-2 px-4 py-3 shadow-lg backdrop-blur-sm transition-all",
                toastStyles[type]
            )}
        >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <p className="flex-1 font-mono text-sm">{message}</p>
            <button
                onClick={onClose}
                className="hover:bg-background/20 flex-shrink-0 rounded p-1 transition-colors"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

export interface ToastContainerProps {
    toasts: ToastProps[];
    onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    return (
        <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-96 flex-col gap-2">
            {toasts.map((toast) => (
                <Toast key={toast.id} {...toast} onClose={() => onRemove(toast.id)} />
            ))}
        </div>
    );
}

// Toast Context
interface ToastContextType {
    toasts: ToastProps[];
    toast: {
        success: (message: string, duration?: number) => string;
        error: (message: string, duration?: number) => string;
        info: (message: string, duration?: number) => string;
        warning: (message: string, duration?: number) => string;
    };
    removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastProps[]>([]);

    const addToast = React.useCallback(
        (message: string, type: ToastProps["type"] = "info", duration = 3000) => {
            const id = `toast-${Date.now()}-${Math.random()}`;
            const toast: ToastProps = { id, message, type, duration };

            setToasts((prev) => [...prev, toast]);

            if (duration > 0) {
                setTimeout(() => {
                    setToasts((prev) => prev.filter((t) => t.id !== id));
                }, duration);
            }

            return id;
        },
        []
    );

    const removeToast = React.useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = React.useMemo(
        () => ({
            success: (message: string, duration?: number) => addToast(message, "success", duration),
            error: (message: string, duration?: number) => addToast(message, "error", duration),
            info: (message: string, duration?: number) => addToast(message, "info", duration),
            warning: (message: string, duration?: number) => addToast(message, "warning", duration),
        }),
        [addToast]
    );

    return (
        <ToastContext.Provider value={{ toasts, toast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = React.useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within ToastProvider");
    }
    return context;
}
