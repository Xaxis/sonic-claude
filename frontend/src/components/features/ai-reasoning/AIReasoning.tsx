import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AIReasoningProps {
  reasoning: string
}

export function AIReasoning({ reasoning }: AIReasoningProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Highlight parameters and numbers in the reasoning text
  const highlightText = (text: string) => {
    if (!text) return null

    // Split by common parameter names and numbers
    const parts = text.split(/(\b(?:bpm|intensity|cutoff|reverb|echo|key|scale|energy|brightness|rhythm)\b|\d+\.?\d*)/gi)
    
    return parts.map((part, i) => {
      // Check if it's a parameter name
      if (/^(bpm|intensity|cutoff|reverb|echo|key|scale|energy|brightness|rhythm)$/i.test(part)) {
        return (
          <span key={i} className="text-cyan-400 font-semibold">
            {part}
          </span>
        )
      }
      // Check if it's a number
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
    <Card className="bg-black/40 border-magenta-500/30">
      <CardHeader className="border-b border-magenta-500/20 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-magenta-400">
            <Brain className="w-5 h-5" />
            AI REASONING
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 px-2"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-4">
          {reasoning ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-300 leading-relaxed bg-black/30 rounded p-3 border border-magenta-500/20">
                {highlightText(reasoning)}
              </div>
              <div className="text-xs text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4">
              No reasoning available yet. The AI will explain its decisions here.
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

