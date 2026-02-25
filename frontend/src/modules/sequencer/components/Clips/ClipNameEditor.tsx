/**
 * ClipNameEditor - Inline editing component for clip names
 * 
 * Displays clip name with pencil icon button.
 * Click pencil → inline text field appears
 * Type new name → press Enter or click checkmark to save
 * Press Escape to cancel
 * 
 * BRILLIANT UI/UX:
 * - Seamless inline editing
 * - Clear visual feedback
 * - Keyboard shortcuts (Enter to save, Escape to cancel)
 * - Auto-focus on edit mode
 * - Prevents event bubbling to clip selection
 */

import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClipNameEditorProps {
    clipId: string;
    clipName: string;
    onSave: (clipId: string, newName: string) => void;
    className?: string;
    isExpanded?: boolean;  // Different layout for expanded vs minimized tracks (reserved for future use)
}

export function ClipNameEditor({
    clipId,
    clipName,
    onSave,
    className
}: ClipNameEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(clipName);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus input when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        const trimmedValue = editValue.trim();
        if (trimmedValue && trimmedValue !== clipName) {
            onSave(clipId, trimmedValue);
        }
        setIsEditing(false);
        setEditValue(clipName);  // Reset to original if cancelled
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditValue(clipName);  // Reset to original
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <div 
                className={cn("flex items-center gap-1 pointer-events-auto", className)}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    className={cn(
                        "flex-1 bg-background/90 text-white rounded px-2 py-0.5 text-xs font-medium",
                        "border border-primary/50 focus:outline-none focus:border-primary",
                        "min-w-0"
                    )}
                    placeholder="Clip name"
                />
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleSave();
                    }}
                    className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded bg-primary/20 hover:bg-primary/30 transition-colors"
                    title="Save (Enter)"
                >
                    <Check size={12} className="text-primary" />
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleCancel();
                    }}
                    className="flex-shrink-0 h-5 w-5 flex items-center justify-center rounded bg-destructive/20 hover:bg-destructive/30 transition-colors"
                    title="Cancel (Escape)"
                >
                    <X size={12} className="text-destructive" />
                </button>
            </div>
        );
    }

    return (
        <div 
            className={cn("flex items-center gap-1 group pointer-events-auto", className)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <span className="text-xs font-medium text-white truncate flex-1">
                {clipName}
            </span>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                }}
                className={cn(
                    "flex-shrink-0 h-4 w-4 flex items-center justify-center rounded",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    "bg-background/60 hover:bg-background/80"
                )}
                title="Rename clip"
            >
                <Pencil size={10} className="text-white/80" />
            </button>
        </div>
    );
}

