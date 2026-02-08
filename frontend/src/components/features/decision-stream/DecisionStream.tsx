import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, CheckCircle2 } from 'lucide-react'
import type { Decision } from '@/types'

interface DecisionStreamProps {
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
    <div className="bg-black/30 border border-cyan-500/20 rounded-lg p-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <div>
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

export function DecisionStream({ decisions }: DecisionStreamProps) {
  return (
    <Card className="bg-black/40 border-cyan-500/30">
      <CardHeader className="border-b border-cyan-500/20 pb-3">
        <CardTitle className="flex items-center gap-2 text-cyan-400">
          <TrendingUp className="w-5 h-5" />
          DECISION STREAM
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {decisions.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">
            No decisions yet. The AI will make intelligent changes based on audio analysis and your conversation.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-500/30 scrollbar-track-transparent">
            {decisions.slice().reverse().map((decision, idx) => (
              <DecisionItem key={idx} decision={decision} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

