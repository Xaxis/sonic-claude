# Sonic Claude - STUDIO Mega-Panel Design

## 🎯 Vision

A unified composition interface that integrates all aspects of live AI-assisted music creation into one cohesive workflow. The STUDIO panel represents the complete **composition loop**: Input → Process → Arrange → Output.

## 🎨 Layout Architecture

### Four Integrated Lanes:

```
┌─────────────────────────────────────────────────────────────────┐
│  🎛️ SONIC CLAUDE - STUDIO                                       │
├──────────┬──────────────────────────────────┬───────────────────┤
│          │                                  │                   │
│ 📥 INPUT │    🎼 SEQUENCER/TIMELINE         │  🎛️ SYNTHESIS    │
│  (20%)   │          (40%)                   │   & EFFECTS (25%) │
│          │                                  │                   │
│  Live    │  ┌────────────────────────────┐  │  Active Synths:   │
│  Trans   │  │ Track 1: [====]  [==]      │  │  • Kick (909)     │
│  ▶️      │  │ Track 2: [=======]         │  │  • Bass (Sub)     │
│          │  │ Track 3:    [===] [=]      │  │  • Lead (Saw)     │
│  Sample  │  │ Track 4: [==]              │  │                   │
│  Library │  └────────────────────────────┘  │  Effect Chains:   │
│  🎵      │                                  │  Track 1: Reverb  │
│          │  Piano Roll (overlay):           │  Track 2: Delay   │
│  Pads    │  [MIDI note editor]              │                   │
│  🎹      │                                  │  Mixer:           │
│          │  ▶️ ⏸️ ⏹️  120 BPM  4/4          │  🎚️🎚️🎚️🎚️       │
│          │                                  │                   │
├──────────┴──────────────────────────────────┴───────────────────┤
│  🤖 AI AGENT (15% height, full width)                           │
│  💬 Chat: "Make it darker"  |  🧠 Reasoning: "Lowering..."      │
│  ⚡ Quick: [Add Bass] [Transcribe] [Suggest Melody]             │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Component Structure

### 1. LEFT LANE: Input Sources (20% width)

**Purpose**: All input sources for composition

**Components**:
- **Live Transcription** (always visible)
  - Real-time audio transcription
  - Auto-feed button to sequencer
  - Stem separation controls
  - Visual waveform preview
  
- **Sample Library** (collapsible)
  - Recorded samples
  - Drag-and-drop to sequencer
  - Quick preview playback
  - Spectral analysis attachment
  
- **Programmable Pads** (collapsible)
  - 4x4 pad grid
  - Trigger clips/samples
  - Send to sequencer
  
- **Audio Device Selector**
  - Input device selection
  - Level meter

**Data Flow**:
- Transcription → Auto-insert clips to timeline
- Samples → Drag to timeline tracks
- Pads → Trigger clips in timeline

### 2. CENTER LANE: Sequencer/Timeline (40% width)

**Purpose**: Main composition workspace

**Components**:
- **Multi-Track Timeline**
  - Horizontal tracks (like Ableton Session View)
  - Clips with waveform/MIDI visualization
  - Drag-and-drop from left lane
  - Real-time playback cursor
  - AI suggestion overlays (ghost notes)
  
- **Piano Roll Overlay**
  - Appears when MIDI clip selected
  - Full MIDI editing
  - Velocity, duration, pitch
  
- **Transport Controls**
  - Play, Pause, Stop, Record
  - BPM control
  - Time signature
  - Loop region

**Data Flow**:
- Receives clips from Input Lane
- Sends audio to Synthesis Lane
- Receives AI suggestions from AI Lane

### 3. RIGHT LANE: Synthesis & Effects (25% width)

**Purpose**: Sound design and mixing

**Components**:
- **Active Synths** (scrollable list)
  - Currently playing synths
  - Quick parameter controls
  - Visual activity indicators
  - Add/remove synths
  
- **Effect Chains** (per-track)
  - Reverb, Delay, Filters, etc.
  - Drag-and-drop effect ordering
  - Bypass/enable toggles
  
- **Mixer Strips** (compact vertical)
  - Volume faders per track
  - Pan controls
  - Mute/Solo buttons
  - Send levels
  - Metering

**Data Flow**:
- Receives audio from Sequencer
- Processes through effects
- Outputs to master
- Receives AI parameter suggestions

### 4. BOTTOM LANE: AI Agent (15% height, full width)

**Purpose**: AI interaction and control

**Components**:
- **Chat Interface** (left 50%)
  - Natural language input
  - Conversation history
  - Audio context awareness
  
- **Reasoning Display** (right 30%)
  - Live AI reasoning
  - Current analysis
  - Decision confidence
  
- **Quick Actions** (right 20%)
  - One-click buttons
  - "Add Bass", "Transcribe", "Suggest Melody"
  - Audio analysis visualization

**Data Flow**:
- Sends control commands to all lanes
- Receives audio analysis from engine
- Suggests parameters to Synthesis Lane
- Suggests clips/patterns to Sequencer

## 🔄 Unified Workflow

### Example: Transcription to Composition

1. User speaks/plays into microphone
2. **Input Lane**: Live transcription processes audio
3. **Input Lane**: User clicks "Send to Timeline"
4. **Sequencer Lane**: Clips auto-populate on tracks (drums, bass, melody)
5. **Synthesis Lane**: Synths auto-assigned to tracks
6. **AI Lane**: AI suggests improvements ("Add reverb to drums?")
7. **Sequencer Lane**: User edits in piano roll
8. **Synthesis Lane**: User adjusts mixer levels
9. **AI Lane**: User chats "make it darker"
10. **Synthesis Lane**: AI adjusts synth parameters
11. **Sequencer Lane**: Playback with all changes

## 🎯 Key Features

- **No Tab Switching**: Everything visible at once
- **Auto-Integration**: Transcription → Timeline → Synths → Mix
- **AI-First**: Agent always present, suggesting and controlling
- **Drag-and-Drop**: Samples, effects, clips all draggable
- **Real-Time**: Live playback, live transcription, live AI
- **Performance Ready**: Optimized for live performance

## 🚀 Implementation Plan

1. Create `frontend/src/components/features/studio/` directory
2. Build lane components:
   - `Studio.tsx` - Main container
   - `InputLane.tsx` - Left lane
   - `SequencerLane.tsx` - Center lane
   - `SynthesisLane.tsx` - Right lane
   - `AILane.tsx` - Bottom lane
3. Integrate existing components:
   - Reuse `LiveTranscription`, `SampleStudio`, `Pads`
   - Reuse `Timeline`, `PianoRoll`, `TransportControls`
   - Create new `SynthList`, `EffectChain`, `MixerStrip`
   - Reuse `AIChat`, `AIReasoning`
4. Connect to audio engine API (48 routes)
5. Implement drag-and-drop between lanes
6. Add AI suggestion overlays

