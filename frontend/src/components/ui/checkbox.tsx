import * as React from "react";

export interface CheckboxProps {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}

export function Checkbox({
    checked = false,
    onCheckedChange,
    disabled = false,
    className = "",
}: CheckboxProps) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (onCheckedChange) {
            onCheckedChange(e.target.checked);
        }
    };

    return (
        <input
            type="checkbox"
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            className={`border-primary/50 bg-background checked:bg-primary checked:border-primary focus:ring-primary/50 h-4 w-4 cursor-pointer rounded border-2 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        />
    );
}
