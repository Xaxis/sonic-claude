import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AIReasoningProps {
    reasoning: string;
}

export function AIReasoning({ reasoning }: AIReasoningProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    // Highlight parameters and numbers in the reasoning text
    const highlightText = (text: string) => {
        if (!text) return null;

        // Split by common parameter names and numbers
        const parts = text.split(
            /(\b(?:bpm|intensity|cutoff|reverb|echo|key|scale|energy|brightness|rhythm)\b|\d+\.?\d*)/gi
        );

        return parts.map((part, i) => {
            // Check if it's a parameter name
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
            // Check if it's a number
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
        <Card className="border-magenta-500/30 bg-black/40">
            <CardHeader className="border-magenta-500/20 border-b pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-magenta-400 flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        AI REASONING
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-6 px-2"
                    >
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4" />
                        )}
                    </Button>
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="p-4">
                    {reasoning ? (
                        <div className="space-y-2">
                            <div className="border-magenta-500/20 rounded border bg-black/30 p-3 text-sm leading-relaxed text-gray-300">
                                {highlightText(reasoning)}
                            </div>
                            <div className="text-xs text-gray-500">
                                Last updated: {new Date().toLocaleTimeString()}
                            </div>
                        </div>
                    ) : (
                        <div className="py-4 text-center text-sm text-gray-500">
                            No reasoning available yet. The AI will explain its decisions here.
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
