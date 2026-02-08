import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, CheckCircle2 } from "lucide-react";
import type { Decision } from "@/types";

interface DecisionStreamProps {
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
        <div className="animate-in slide-in-from-bottom-2 rounded-lg border border-cyan-500/20 bg-black/30 p-3 duration-300">
            <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-cyan-400" />
                    <div>
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

export function DecisionStream({ decisions }: DecisionStreamProps) {
    return (
        <Card className="border-cyan-500/30 bg-black/40">
            <CardHeader className="border-b border-cyan-500/20 pb-3">
                <CardTitle className="flex items-center gap-2 text-cyan-400">
                    <TrendingUp className="h-5 w-5" />
                    DECISION STREAM
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                {decisions.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">
                        No decisions yet. The AI will make intelligent changes based on audio
                        analysis and your conversation.
                    </div>
                ) : (
                    <div className="scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent max-h-64 space-y-2 overflow-y-auto pr-2">
                        {decisions
                            .slice()
                            .reverse()
                            .map((decision, idx) => (
                                <DecisionItem key={idx} decision={decision} />
                            ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
