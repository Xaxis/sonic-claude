import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format ISO date string for display
 * Consistent date formatting across the application
 */
export function formatDate(isoString: string | undefined): string {
    if (!isoString) return "Unknown";
    const date = new Date(isoString);
    return date.toLocaleString();
}
