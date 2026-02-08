import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import type { Decision } from "@/types";

interface AIActivityProps {
    reasoning: string;
    decisions: Decision[];
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
    const percentage = Math.round(confidence * 100);

    let colorClass = "bg-gray-500/20 text-gray-400 border-gray-500/30";
    if (confidence >= 0.8) {
        colorClass = "bg-green-500/20 text-green-400 border-green-500/30";
    } else if (confidence >= 0.6) {
        colorClass = "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    } else if (confidence >= 0.4) {
        colorClass = "bg-orange-500/20 text-orange-400 border-orange-500/30";
    }

    return (
        <div className={`rounded border px-2 py-0.5 font-mono text-xs ${colorClass}`}>
            {percentage}%
        </div>
    );
}

function DecisionItem({ decision }: { decision: Decision }) {
    return (
        <div className="animate-in rounded-lg border border-cyan-500/20 bg-black/30 p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex flex-1 items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-cyan-400" />
                    <div className="flex-1">
                        <span className="font-semibold text-cyan-400">{decision.parameter}</span>
                        <span className="mx-2 text-gray-400">→</span>
                        <span className="text-magenta-400 font-mono">{decision.value}</span>
                    </div>
                </div>
                <ConfidenceBadge confidence={decision.confidence} />
            </div>
            <div className="pl-6 text-xs leading-relaxed text-gray-400">{decision.reason}</div>
        </div>
    );
}

export function AIActivity({ reasoning, decisions }: AIActivityProps) {
    // Highlight parameters and numbers in the reasoning text
    const highlightText = (text: string) => {
        if (!text) return null;

        const parts = text.split(
            /(\b(?:bpm|intensity|cutoff|reverb|echo|key|scale|energy|brightness|rhythm)\b|\d+\.?\d*)/gi
        );

        return parts.map((part, i) => {
            if (
                /^(bpm|intensity|cutoff|reverb|echo|key|scale|energy|brightness|rhythm)$/i.test(
                    part
                )
            ) {
                return (
                    <span key={i} className="font-semibold text-cyan-400">
                        {part}
                    </span>
                );
            }
            if (/^\d+\.?\d*$/.test(part)) {
                return (
                    <span key={i} className="text-magenta-400 font-mono">
                        {part}
                    </span>
                );
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <Card className="border-magenta-500/30 flex h-full flex-col bg-black/40">
            <CardHeader className="border-magenta-500/20 border-b pb-3">
                <CardTitle className="text-magenta-400 flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI ACTIVITY
                </CardTitle>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
                {/* Current Reasoning */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs tracking-wide text-gray-400 uppercase">
                        <Brain className="h-3.5 w-3.5" />
                        Current Reasoning
                    </div>
                    {reasoning ? (
                        <div className="border-magenta-500/20 rounded border bg-black/30 p-3 text-sm leading-relaxed text-gray-300">
                            {highlightText(reasoning)}
                        </div>
                    ) : (
                        <div className="rounded border border-gray-700/30 bg-black/20 py-4 text-center text-sm text-gray-500">
                            AI is listening... Start a conversation to see reasoning.
                        </div>
                    )}
                </div>

                {/* Recent Decisions */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    <div className="mb-2 flex items-center gap-2 text-xs tracking-wide text-gray-400 uppercase">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Recent Decisions ({decisions.length})
                    </div>
                    {decisions.length === 0 ? (
                        <div className="rounded border border-gray-700/30 bg-black/20 py-8 text-center text-sm text-gray-500">
                            No decisions yet. The AI will make intelligent changes based on audio
                            analysis and your conversation.
                        </div>
                    ) : (
                        <div className="scrollbar-thin scrollbar-thumb-magenta-500/30 scrollbar-track-transparent flex-1 space-y-2 overflow-y-auto pr-2">
                            {decisions
                                .slice()
                                .reverse()
                                .map((decision, idx) => (
                                    <DecisionItem key={idx} decision={decision} />
                                ))}
                        </div>
                    )}
                </div>

                {/* Timestamp */}
                {(reasoning || decisions.length > 0) && (
                    <div className="flex items-center gap-1.5 border-t border-gray-700/30 pt-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        Last updated: {new Date().toLocaleTimeString()}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
