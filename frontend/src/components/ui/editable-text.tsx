/**
 * EditableText — Inline text field that toggles between display and edit mode.
 *
 * Display mode: renders as a styled <div> with truncation.
 * Edit mode:    renders as a controlled <input> with Enter/Escape handling.
 *              Optionally shows save/cancel icon buttons for explicit confirmation.
 *
 * Contract:
 *   - Caller manages isEditing state and the current string value.
 *   - onChange fires on every keystroke (controlled input).
 *   - onSave fires on Enter or save button click — caller commits to store.
 *   - onCancel fires on Escape or cancel button click — caller resets value.
 *
 * Usage:
 *   // Minimized mode — click-away implied, no buttons:
 *   <EditableText
 *     value={editName}
 *     isEditing={isEditing}
 *     onChange={setEditName}
 *     onSave={handleSave}
 *     onCancel={handleCancel}
 *   />
 *
 *   // Expanded mode — explicit save/cancel buttons:
 *   <EditableText
 *     value={editName}
 *     isEditing={isEditing}
 *     onChange={setEditName}
 *     onSave={handleSave}
 *     onCancel={handleCancel}
 *     showButtons
 *   />
 */

import * as React from "react";
import { Check, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface EditableTextProps {
    value:        string;
    isEditing:    boolean;
    onChange:     (v: string) => void;
    onSave:       () => void;
    onCancel:     () => void;
    /** Show explicit save ✓ / cancel ✕ icon buttons beside the input */
    showButtons?: boolean;
    /** Tailwind text-size class for display mode (default: text-sm) */
    displaySize?: string;
    /** Tailwind text-size class for input (default: text-sm) */
    inputSize?:   string;
    placeholder?: string;
    className?:   string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditableText({
    value,
    isEditing,
    onChange,
    onSave,
    onCancel,
    showButtons  = false,
    displaySize  = "text-sm",
    inputSize    = "text-sm",
    placeholder,
    className,
}: EditableTextProps) {
    if (!isEditing) {
        return (
            <div className={cn("font-medium truncate", displaySize, className)}>
                {value || placeholder}
            </div>
        );
    }

    return (
        <div className={cn("flex items-center gap-1 min-w-0", className)}>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter")  { e.preventDefault(); onSave();   }
                    if (e.key === "Escape") { e.preventDefault(); onCancel(); }
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                placeholder={placeholder}
                className={cn(
                    "flex-1 min-w-0 px-1.5 py-0.5 font-medium rounded",
                    "bg-background border border-primary",
                    "focus:outline-none focus:ring-1 focus:ring-primary/50",
                    inputSize,
                )}
            />
            {showButtons && (
                <>
                    <IconButton
                        icon={Check}
                        onClick={onSave}
                        size="icon-xs"
                        variant="ghost"
                        tooltip="Save (Enter)"
                        className="flex-shrink-0"
                    />
                    <IconButton
                        icon={X}
                        onClick={onCancel}
                        size="icon-xs"
                        variant="ghost"
                        tooltip="Cancel (Escape)"
                        className="flex-shrink-0"
                    />
                </>
            )}
        </div>
    );
}
