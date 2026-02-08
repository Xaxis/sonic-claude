import { useAIStatus } from '@/hooks/use-ai-status'
import { useSpectrumWebSocket } from '@/hooks/use-spectrum-websocket'
import { Header } from '@/components/features/header'
import { Controls } from '@/components/features/controls'
import { AIChat } from '@/components/features/ai-chat'
import { SpectrumAnalyzer } from '@/components/features/spectrum'
import { Analytics } from '@/components/features/analytics'
import { AIActivity } from '@/components/features/ai-activity'
import { DraggableLayout } from '@/components/layout'
import type { Layout } from 'react-grid-layout'

export default function App() {
  const { status, error, isLoading } = useAIStatus()
  const { spectrum, isConnected: spectrumConnected } = useSpectrumWebSocket()

  const handleLayoutChange = (layout: Layout[]) => {
    // Save layout to localStorage
    localStorage.setItem('sonic-claude-layout', JSON.stringify(layout))
  }

  // Don't block UI if backend is down - just show disconnected state

  const panels = [
    {
      id: 'controls',
      title: 'PERFORMANCE CONTROLS',
      component: <Controls />,
      defaultLayout: { i: 'controls', x: 0, y: 0, w: 3, h: 18, minW: 2, minH: 12 },
      closeable: false
    },
    {
      id: 'spectrum',
      title: 'LIVE SPECTRUM',
      component: <SpectrumAnalyzer spectrum={spectrum} isConnected={spectrumConnected} />,
      defaultLayout: { i: 'spectrum', x: 3, y: 0, w: 6, h: 9, minW: 4, minH: 5 },
      closeable: true
    },
    {
      id: 'analytics',
      title: 'AUDIO METRICS',
      component: (
        <Analytics
          audioAnalysis={status?.audio_analysis ?? {
            energy: 0,
            brightness: 0,
            rhythm: 0,
            dominant_frequency: 0
          }}
          musicalState={status?.current_state ?? {
            bpm: 120,
            intensity: 5,
            complexity: 5,
            key: 'C',
            scale: 'minor'
          }}
        />
      ),
      defaultLayout: { i: 'analytics', x: 9, y: 0, w: 3, h: 9, minW: 2, minH: 6 },
      closeable: true
    },
    {
      id: 'chat',
      title: 'AI CONVERSATION',
      component: <AIChat />,
      defaultLayout: { i: 'chat', x: 3, y: 9, w: 6, h: 12, minW: 3, minH: 8 },
      closeable: true
    },
    {
      id: 'ai-activity',
      title: 'AI REASONING',
      component: (
        <AIActivity
          reasoning={status?.llm_reasoning ?? ''}
          decisions={status?.recent_decisions ?? []}
        />
      ),
      defaultLayout: { i: 'ai-activity', x: 0, y: 18, w: 12, h: 10, minW: 4, minH: 6 },
      closeable: true
    }
  ]

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Header */}
      <Header
        isAIOnline={status?.is_running ?? false}
        sonicPiStatus="READY"
        audioEngineStatus="MONITORING"
      />

      {/* Main Content - Draggable Layout */}
      <div className="flex-1 overflow-hidden p-2">
        <DraggableLayout panels={panels} onLayoutChange={handleLayoutChange} />
      </div>
    </div>
  )
}

