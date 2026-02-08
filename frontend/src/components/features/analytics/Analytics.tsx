import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Zap, Music, Radio } from 'lucide-react'
import type { AudioAnalysis, MusicalState } from '@/types'

interface AnalyticsProps {
  audioAnalysis: AudioAnalysis
  musicalState: MusicalState
}

function MetricBar({ label, value, max = 1, color = 'cyan', icon: Icon }: {
  label: string
  value: number
  max?: number
  color?: 'cyan' | 'magenta' | 'yellow'
  icon?: React.ElementType
}) {
  const percentage = (value / max) * 100
  const colorClasses = {
    cyan: 'bg-cyan-500',
    magenta: 'bg-magenta-500',
    yellow: 'bg-yellow-500'
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 opacity-70" />}
          <span className="text-gray-400 uppercase tracking-wide">{label}</span>
        </div>
        <span className="text-gray-300 font-mono">{value.toFixed(2)}</span>
      </div>
      <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-gray-700/50">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  )
}

function StatBox({ label, value, unit, color = 'cyan', icon: Icon }: {
  label: string
  value: string | number
  unit?: string
  color?: 'cyan' | 'magenta' | 'yellow'
  icon?: React.ElementType
}) {
  const colorClasses = {
    cyan: 'text-cyan-400 border-cyan-500/30',
    magenta: 'text-magenta-400 border-magenta-500/30',
    yellow: 'text-yellow-400 border-yellow-500/30'
  }

  return (
    <div className={`bg-black/40 border ${colorClasses[color]} rounded-lg p-3`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="w-4 h-4 opacity-70" />}
        <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
      </div>
      <div className={`text-2xl font-bold ${colorClasses[color]} font-mono`}>
        {value}
        {unit && <span className="text-sm ml-1 opacity-70">{unit}</span>}
      </div>
    </div>
  )
}

export function Analytics({ audioAnalysis, musicalState }: AnalyticsProps) {
  return (
    <Card className="bg-black/40 border-cyan-500/30">
      <CardHeader className="border-b border-cyan-500/20 pb-3">
        <CardTitle className="flex items-center gap-2 text-cyan-400">
          <BarChart3 className="w-5 h-5" />
          AUDIO ANALYTICS
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Audio Metrics */}
        <div className="space-y-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Audio Analysis</div>
          <MetricBar
            label="Energy"
            value={audioAnalysis.energy}
            max={1}
            color="cyan"
            icon={Zap}
          />
          <MetricBar
            label="Rhythm"
            value={audioAnalysis.rhythm}
            max={1}
            color="magenta"
            icon={Radio}
          />
          <MetricBar
            label="Brightness"
            value={audioAnalysis.brightness}
            max={5000}
            color="yellow"
            icon={Music}
          />
        </div>

        {/* Musical State Stats */}
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Musical State</div>
          <div className="grid grid-cols-2 gap-2">
            <StatBox
              label="BPM"
              value={musicalState.bpm}
              color="cyan"
            />
            <StatBox
              label="Intensity"
              value={musicalState.intensity.toFixed(1)}
              color="magenta"
            />
            <StatBox
              label="Key"
              value={musicalState.key || 'C'}
              color="yellow"
            />
            <StatBox
              label="Scale"
              value={musicalState.scale || 'minor'}
              color="cyan"
            />
          </div>
        </div>

        {/* Dominant Frequency */}
        {audioAnalysis.dominant_frequency > 0 && (
          <div className="pt-2 border-t border-gray-700/50">
            <div className="text-xs text-gray-400 mb-1">Dominant Frequency</div>
            <div className="text-lg font-mono text-cyan-400">
              {audioAnalysis.dominant_frequency.toFixed(1)} <span className="text-sm opacity-70">Hz</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

