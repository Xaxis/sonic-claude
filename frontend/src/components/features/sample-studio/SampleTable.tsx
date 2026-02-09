import { useState, useMemo, useRef, useEffect } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    createColumnHelper,
    SortingState,
    ColumnFiltersState,
} from "@tanstack/react-table";
import { Play, Pause, Edit2, Trash2, ArrowUpDown, Search, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Sample } from "@/types";

const columnHelper = createColumnHelper<Sample>();

interface SampleTableProps {
    samples: Sample[];
    selectedSample: Sample | null;
    isPlaying: boolean;
    onSelectSample: (sample: Sample) => void;
    onPlaySample: (sample: Sample) => void;
    onEditSample: (sample: Sample) => void;
    onDeleteSample: (sampleId: string) => void;
    onSamplesChanged: () => void;
}

export function SampleTable({
    samples,
    selectedSample,
    isPlaying,
    onSelectSample,
    onPlaySample,
    onEditSample,
    onDeleteSample,
    onSamplesChanged,
}: SampleTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState("");

    const columns = useMemo(
        () => [
            columnHelper.accessor("name", {
                header: "Name",
                cell: (info) => {
                    return <div className="font-medium">{info.getValue()}</div>;
                },
            }),
            columnHelper.accessor("duration", {
                header: "Duration",
                cell: (info) => (
                    <div className="font-mono text-xs">
                        {info.getValue().toFixed(2)}s
                    </div>
                ),
            }),
            columnHelper.accessor("sample_rate", {
                header: "Sample Rate",
                cell: (info) => (
                    <div className="font-mono text-xs">
                        {info.getValue()}Hz
                    </div>
                ),
            }),
            columnHelper.accessor("file_size", {
                header: "Size",
                cell: (info) => (
                    <div className="font-mono text-xs">
                        {(info.getValue() / 1024).toFixed(1)}KB
                    </div>
                ),
            }),
            columnHelper.display({
                id: "actions",
                header: "Actions",
                cell: (info) => {
                    const sample = info.row.original;
                    const isCurrentlyPlaying = selectedSample?.id === sample.id && isPlaying;

                    return (
                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPlaySample(sample);
                                }}
                                className="h-6 w-6 p-0"
                                title={isCurrentlyPlaying ? "Pause" : "Play"}
                            >
                                {isCurrentlyPlaying ? (
                                    <Pause className="h-3 w-3" />
                                ) : (
                                    <Play className="h-3 w-3" />
                                )}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditSample(sample);
                                }}
                                className="h-6 w-6 p-0"
                                title="Rename"
                            >
                                <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSample(sample.id);
                                }}
                                className="h-6 w-6 p-0"
                                title="Delete"
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    );
                },
            }),
        ],
        [selectedSample, isPlaying, onPlaySample, onEditSample, onDeleteSample]
    );

    const table = useReactTable({
        data: samples,
        columns,
        state: {
            sorting,
            columnFilters,
            globalFilter,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div className="space-y-3">
            {/* Search */}
            <div className="relative">
                <Search className="text-muted-foreground absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
                <Input
                    placeholder="Search samples..."
                    value={globalFilter ?? ""}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="h-8 pl-8 text-sm"
                />
            </div>

            {/* Table */}
            <div className="bg-primary/5 border-primary/10 rounded-lg border">
                <div className="max-h-[400px] overflow-auto">
                    <table className="w-full">
                        <thead className="bg-primary/10 sticky top-0 z-10">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <th
                                            key={header.id}
                                            className="text-muted-foreground px-3 py-2 text-left text-xs font-medium uppercase tracking-wider"
                                        >
                                            {header.isPlaceholder ? null : (
                                                <div
                                                    className={
                                                        header.column.getCanSort()
                                                            ? "flex cursor-pointer select-none items-center gap-1 hover:text-foreground"
                                                            : ""
                                                    }
                                                    onClick={header.column.getToggleSortingHandler()}
                                                >
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {header.column.getCanSort() && (
                                                        <ArrowUpDown className="h-3 w-3" />
                                                    )}
                                                </div>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={columns.length}
                                        className="text-muted-foreground px-3 py-8 text-center text-sm"
                                    >
                                        No samples found. Record a sample to get started.
                                    </td>
                                </tr>
                            ) : (
                                table.getRowModel().rows.map((row) => (
                                    <tr
                                        key={row.id}
                                        onClick={() => onSelectSample(row.original)}
                                        className={`cursor-pointer border-t transition-colors ${
                                            selectedSample?.id === row.original.id
                                                ? "bg-primary/15 border-primary/30"
                                                : "border-border/50 hover:bg-primary/5"
                                        }`}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <td key={cell.id} className="px-3 py-2 text-sm">
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Results count */}
            <div className="text-muted-foreground text-xs">
                {table.getFilteredRowModel().rows.length} of {samples.length} sample(s)
            </div>
        </div>
    );
}

