import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, TrendingUp, CheckCircle2, Clock } from 'lucide-react'
import type { Decision } from '@/types'

interface AIActivityProps {
  reasoning: string
  decisions: Decision[]
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100)
  
  let colorClass = 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  if (confidence >= 0.8) {
    colorClass = 'bg-green-500/20 text-green-400 border-green-500/30'
  } else if (confidence >= 0.6) {
    colorClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  } else if (confidence >= 0.4) {
    colorClass = 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  }

  return (
    <div className={`px-2 py-0.5 rounded text-xs font-mono border ${colorClass}`}>
      {percentage}%
    </div>
  )
}

function DecisionItem({ decision }: { decision: Decision }) {
  return (
    <div className="bg-black/30 border border-cyan-500/20 rounded-lg p-3 animate-in">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-cyan-400 font-semibold">{decision.parameter}</span>
            <span className="text-gray-400 mx-2">→</span>
            <span className="text-magenta-400 font-mono">{decision.value}</span>
          </div>
        </div>
        <ConfidenceBadge confidence={decision.confidence} />
      </div>
      <div className="text-xs text-gray-400 leading-relaxed pl-6">
        {decision.reason}
      </div>
    </div>
  )
}

export function AIActivity({ reasoning, decisions }: AIActivityProps) {
  // Highlight parameters and numbers in the reasoning text
  const highlightText = (text: string) => {
    if (!text) return null

    const parts = text.split(/(\b(?:bpm|intensity|cutoff|reverb|echo|key|scale|energy|brightness|rhythm)\b|\d+\.?\d*)/gi)
    
    return parts.map((part, i) => {
      if (/^(bpm|intensity|cutoff|reverb|echo|key|scale|energy|brightness|rhythm)$/i.test(part)) {
        return (
          <span key={i} className="text-cyan-400 font-semibold">
            {part}
          </span>
        )
      }
      if (/^\d+\.?\d*$/.test(part)) {
        return (
          <span key={i} className="text-magenta-400 font-mono">
            {part}
          </span>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <Card className="bg-black/40 border-magenta-500/30 h-full flex flex-col">
      <CardHeader className="border-b border-magenta-500/20 pb-3">
        <CardTitle className="flex items-center gap-2 text-magenta-400">
          <Brain className="w-5 h-5" />
          AI ACTIVITY
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 flex-1 overflow-hidden flex flex-col gap-4">
        {/* Current Reasoning */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wide">
            <Brain className="w-3.5 h-3.5" />
            Current Reasoning
          </div>
          {reasoning ? (
            <div className="text-sm text-gray-300 leading-relaxed bg-black/30 rounded p-3 border border-magenta-500/20">
              {highlightText(reasoning)}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4 bg-black/20 rounded border border-gray-700/30">
              AI is listening... Start a conversation to see reasoning.
            </div>
          )}
        </div>

        {/* Recent Decisions */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wide mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Recent Decisions ({decisions.length})
          </div>
          {decisions.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8 bg-black/20 rounded border border-gray-700/30">
              No decisions yet. The AI will make intelligent changes based on audio analysis and your conversation.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-magenta-500/30 scrollbar-track-transparent">
              {decisions.slice().reverse().map((decision, idx) => (
                <DecisionItem key={idx} decision={decision} />
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        {(reasoning || decisions.length > 0) && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 pt-2 border-t border-gray-700/30">
            <Clock className="w-3 h-3" />
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

