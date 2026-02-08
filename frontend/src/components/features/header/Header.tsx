import { Music } from 'lucide-react'

interface HeaderProps {
  isAIOnline: boolean
  sonicPiStatus: string
  audioEngineStatus: string
}

export function Header({ isAIOnline, sonicPiStatus, audioEngineStatus }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-4 bg-card border-b-2 border-border h-[100px]">
      {/* Left: Logo */}
      <div className="flex items-center gap-4">
        <Music className="w-10 h-10 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-[0.3em] text-primary text-glow-cyan">
            SONIC CLAUDE
          </h1>
          <p className="text-xs tracking-[0.2em] text-muted-foreground">
            AI PERFORMANCE SYSTEM
          </p>
        </div>
      </div>

      {/* Center: Brain Visualization */}
      <div className="flex-1 flex justify-center">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute w-8 h-8 border-2 border-secondary rounded-full animate-pulse" />
          <div className="absolute w-12 h-12 border-2 border-secondary rounded-full animate-pulse [animation-delay:300ms]" />
          <div className="absolute w-16 h-16 border-2 border-secondary rounded-full animate-pulse [animation-delay:600ms]" />
        </div>
      </div>

      {/* Right: Status Badges */}
      <div className="flex gap-6">
        <StatusBadge 
          label="AI AGENT" 
          value={isAIOnline ? 'ONLINE' : 'OFFLINE'}
          online={isAIOnline}
        />
        <StatusBadge 
          label="SONIC PI" 
          value={sonicPiStatus}
        />
        <StatusBadge 
          label="AUDIO ENGINE" 
          value={audioEngineStatus}
        />
      </div>
    </header>
  )
}

interface StatusBadgeProps {
  label: string
  value: string
  online?: boolean
}

function StatusBadge({ label, value, online }: StatusBadgeProps) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[0.65rem] tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
      <span className={`text-sm font-bold tracking-wider ${
        online === true ? 'text-primary text-glow-cyan' :
        online === false ? 'text-destructive' :
        'text-foreground'
      }`}>
        {value}
      </span>
    </div>
  )
}

