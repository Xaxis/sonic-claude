export interface AudioAnalysis {
  energy: number
  brightness: number
  rhythm: number
  dominant_frequency: number
}

export interface MusicalState {
  bpm: number
  key?: string
  scale?: string
  intensity: number
  complexity: number
  energy_level?: number
}

export interface Decision {
  parameter: string
  value: number | string
  confidence: number
  reason: string
}

export interface AIStatus {
  is_running: boolean
  is_playing: boolean
  audio_analysis: AudioAnalysis
  current_state: MusicalState
  recent_decisions: Decision[]
  frequency_spectrum: number[]
  llm_reasoning: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface OSCParameter {
  parameter: string
  value: number | string
}

