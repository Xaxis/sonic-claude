/**
 * AIStatusIndicator - Shows AI activity status with dropdown history
 * 
 * Replaces the "ENGINE ONLINE" indicator with AI status.
 * Shows active AI requests and provides a dropdown with complete history.
 */

import { useState, useRef, useEffect } from "react";
import { Sparkles, ChevronDown, CheckCircle2, AlertCircle, Clock, MessageSquare, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDAWStore, type AIRequestHistoryEntry } from "@/stores/dawStore";
import { formatDistanceToNow } from "date-fns";

export function AIStatusIndicator() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    const isSendingMessage = useDAWStore((state) => state.isSendingMessage);
    const aiRequestHistory = useDAWStore((state) => state.aiRequestHistory);
    
    // Check if any AI is currently active
    const isAIActive = isSendingMessage || aiRequestHistory.some(entry => entry.status === "pending");
    
    // Get pending count
    const pendingCount = aiRequestHistory.filter(entry => entry.status === "pending").length;
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isOpen]);
    
    return (
        <div className="relative" ref={dropdownRef}>
            {/* Status Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all",
                    "hover:bg-muted/50",
                    isOpen && "bg-muted/50"
                )}
            >
                {/* Status Indicator */}
                <div className="flex items-center gap-2">
                    <div
                        className={cn(
                            "h-2 w-2 rounded-full transition-all",
                            isAIActive
                                ? "bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.6)]"
                                : "bg-muted-foreground/40"
                        )}
                    />
                    <Sparkles className={cn(
                        "h-3.5 w-3.5 transition-all",
                        isAIActive ? "text-cyan-400" : "text-muted-foreground"
                    )} />
                    <span className="text-muted-foreground text-xs font-medium tracking-wider">
                        AI
                    </span>
                    <span
                        className={cn(
                            "text-xs font-bold tracking-wider transition-all",
                            isAIActive ? "text-cyan-400" : "text-muted-foreground"
                        )}
                    >
                        {isAIActive ? `ACTIVE (${pendingCount})` : "IDLE"}
                    </span>
                </div>
                
                {/* Dropdown Arrow */}
                <ChevronDown className={cn(
                    "h-3 w-3 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>
            
            {/* Dropdown History Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-[400px] max-h-[500px] overflow-hidden bg-card border-2 border-border rounded-lg shadow-2xl z-50">
                    {/* Header */}
                    <div className="bg-muted/30 border-b border-border px-4 py-3">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-cyan-400" />
                            AI Request History
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            {aiRequestHistory.length} total requests
                        </p>
                    </div>
                    
                    {/* History List */}
                    <div className="overflow-y-auto max-h-[400px]">
                        {aiRequestHistory.length === 0 ? (
                            <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                                No AI requests yet
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {aiRequestHistory.map((entry) => (
                                    <AIHistoryEntry key={entry.id} entry={entry} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

interface AIHistoryEntryProps {
    entry: AIRequestHistoryEntry;
}

function AIHistoryEntry({ entry }: AIHistoryEntryProps) {
    const statusIcons = {
        pending: <Clock className="h-3.5 w-3.5 text-yellow-500 animate-spin" />,
        success: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
        error: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
    };
    const statusIcon = statusIcons[entry.status];
    
    const sourceIcon = entry.source === "chat" 
        ? <MessageSquare className="h-3 w-3 text-muted-foreground" />
        : <Zap className="h-3 w-3 text-cyan-400" />;
    
    return (
        <div className="px-4 py-3 hover:bg-muted/20 transition-colors">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {statusIcon}
                    <span className="text-xs font-medium text-foreground truncate">
                        {entry.entityLabel || "Unknown"}
                    </span>
                    {sourceIcon}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                </span>
            </div>
            
            {/* User Message */}
            <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                {entry.userMessage}
            </p>
            
            {/* Actions Count or Error */}
            {entry.status === "success" && entry.actionsExecuted && entry.actionsExecuted.length > 0 && (
                <div className="text-[10px] text-green-500 font-medium">
                    ✓ {entry.actionsExecuted.length} action(s) executed
                </div>
            )}
            {entry.status === "error" && entry.error && (
                <div className="text-[10px] text-red-500 font-medium">
                    ✗ {entry.error}
                </div>
            )}
        </div>
    );
}

