/**
 * SearchableDropdown - Reusable dropdown with search and category grouping
 *
 * Generic component for selecting items from a categorized list with search.
 * Used for instruments, effects, samples, and other categorized selections.
 *
 * Features:
 * - Search/filter functionality
 * - Category grouping with visual headers
 * - Keyboard navigation
 * - Custom rendering for items
 * - Consistent styling across the app
 */

import { useState, useMemo } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
} from "@/components/ui/select";

export interface SearchableDropdownItem {
    value: string;
    label: string;
    category: string;
    description?: string;
    metadata?: Record<string, any>;
}

interface SearchableDropdownProps {
    items: SearchableDropdownItem[];
    value?: string;
    onValueChange: (value: string) => void;
    placeholder?: string;
    icon?: React.ComponentType<{ size?: number; className?: string }>;
    disabled?: boolean;
    className?: string;
    triggerClassName?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    categoryOrder?: string[];
    renderItem?: (item: SearchableDropdownItem) => React.ReactNode;
}

export function SearchableDropdown({
    items,
    value,
    onValueChange,
    placeholder = "Select...",
    icon: Icon,
    disabled = false,
    className,
    triggerClassName,
    searchPlaceholder = "Search...",
    emptyMessage = "No items found",
    categoryOrder,
    renderItem,
}: SearchableDropdownProps) {
    const [searchQuery, setSearchQuery] = useState("");

    // Filter items based on search query
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return items;
        
        const query = searchQuery.toLowerCase();
        return items.filter(item =>
            item.label.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query)
        );
    }, [items, searchQuery]);

    // Group items by category
    const groupedItems = useMemo(() => {
        const groups = filteredItems.reduce((acc, item) => {
            if (!acc[item.category]) {
                acc[item.category] = [];
            }
            acc[item.category].push(item);
            return acc;
        }, {} as Record<string, SearchableDropdownItem[]>);

        // Sort categories if order is provided
        if (categoryOrder) {
            const sortedGroups: Record<string, SearchableDropdownItem[]> = {};
            categoryOrder.forEach(category => {
                if (groups[category]) {
                    sortedGroups[category] = groups[category];
                }
            });
            // Add remaining categories not in the order
            Object.keys(groups).forEach(category => {
                if (!sortedGroups[category]) {
                    sortedGroups[category] = groups[category];
                }
            });
            return sortedGroups;
        }

        return groups;
    }, [filteredItems, categoryOrder]);

    // Get display value
    const selectedItem = items.find(item => item.value === value);
    const displayValue = selectedItem?.label || placeholder;

    // Default item renderer
    const defaultRenderItem = (item: SearchableDropdownItem) => (
        <div className="flex flex-col">
            <span className="font-medium">{item.label}</span>
            {item.description && (
                <span className="text-[10px] text-muted-foreground">
                    {item.description}
                </span>
            )}
        </div>
    );

    const itemRenderer = renderItem || defaultRenderItem;

    return (
        <Select
            value={value || ""}
            onValueChange={onValueChange}
            disabled={disabled}
        >
            <SelectTrigger className={cn("h-7 text-xs border-border/50 hover:border-border transition-colors min-w-0", triggerClassName)}>
                <div className="flex items-center gap-1.5 min-w-0 w-full overflow-hidden">
                    {Icon && <Icon size={12} className="text-muted-foreground flex-shrink-0" />}
                    <span className="truncate text-xs">{displayValue}</span>
                </div>
            </SelectTrigger>
            <SelectContent className={cn("max-h-96 z-[9999]", className)} align="start" position="popper" sideOffset={4}>
                {/* Search Input */}
                <div className="sticky top-0 z-10 bg-card border-b border-border p-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="h-7 pl-7 text-xs"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>

                {/* Items */}
                {Object.keys(groupedItems).length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                        {emptyMessage}
                    </div>
                ) : (
                    Object.entries(groupedItems).map(([category, categoryItems]) => (
                        <SelectGroup key={category}>
                            <SelectLabel className="text-xs font-semibold text-muted-foreground">
                                {category}
                            </SelectLabel>
                            {categoryItems.map((item) => (
                                <SelectItem
                                    key={item.value}
                                    value={item.value}
                                    className="text-xs"
                                >
                                    {itemRenderer(item)}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    ))
                )}
            </SelectContent>
        </Select>
    );
}

