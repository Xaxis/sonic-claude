# Sonic Claude UI/UX Design System

## Critical Problems Identified

1. **Inconsistent Controls**: Using basic HTML sliders instead of professional Knob/Fader components
2. **No Settings Architecture**: No global settings panel or preferences system
3. **Fragmented Patterns**: Each panel built differently with no shared patterns
4. **Missing Functionality**: Beautiful components exist but aren't used
5. **No Visual Hierarchy**: Everything looks the same, no clear information architecture

## Design Principles

### 1. **Professional Audio Interface**
- Use **Knobs** for rotary controls (pan, send amounts, frequency, resonance)
- Use **Faders** for linear controls (volume, gain, mix)
- Use **Meters** for level visualization (always show real-time feedback)
- Use **Sliders** only for horizontal ranges (timeline position, zoom)

### 2. **Consistent Component Hierarchy**
```
Panel (outer container with title/subtitle)
  └── SubPanel (logical sections within panel)
        └── Control Groups (related controls together)
              └── Individual Controls (Knob/Fader/Button/etc)
```

### 3. **Information Density**
- **High-density areas**: Mixer, Effects, Synthesis (many controls, compact)
- **Medium-density areas**: Sequencer, Transport (balanced)
- **Low-density areas**: Visualizers, Metering (focus on display)

## Component Usage Patterns

### Audio Parameter Controls

**ALWAYS use Knobs for:**
- Pan (format: "pan", range: -1 to 1)
- Send amounts (format: "percent", range: 0 to 1)
- Frequency (format: "default", range: 20 to 20000, logarithmic)
- Resonance/Q (format: "default", range: 0 to 1)
- LFO Rate (format: "default", range: 0.01 to 20)
- Filter cutoff (format: "default")
- Effect parameters (reverb size, delay time, etc.)

**ALWAYS use Faders for:**
- Volume (dB scale, range: -96 to +6)
- Gain (dB scale, range: -24 to +24)
- Mix/Dry-Wet (dB or percent, range: -96 to 0 or 0 to 1)
- Track levels
- Send levels (when vertical layout)

**ALWAYS use Meters for:**
- Output levels (peak + RMS)
- Input levels
- Gain reduction (compressor/limiter)
- Spectrum visualization

### Control Layout Patterns

**Mixer Channel Strip (Vertical):**
```
[Track Name]
[Meter] (stereo L/R)
[Fader] (volume)
[Knob] (pan)
[M] [S] (mute/solo buttons)
```

**Effect/Synth Parameter Section (Grid):**
```
[Knob] [Knob] [Knob]
[Knob] [Knob] [Knob]
(2-3 columns, labels below)
```

**Transport Controls (Horizontal):**
```
[◀◀] [▶] [■] [●] [Position] [Tempo]
```

## Settings Architecture

### Global Settings Panel (NEW - MUST BUILD)

**Location**: Accessible from Header (gear icon)
**Structure**:
```
Settings
├── Audio
│   ├── Sample Rate
│   ├── Buffer Size
│   ├── Input Device
│   └── Output Device
├── MIDI
│   ├── Input Devices
│   ├── Output Devices
│   └── MIDI Clock
├── Display
│   ├── Theme (Dark/Light)
│   ├── Meter Mode (Peak/RMS/Both)
│   ├── Waveform Style
│   └── Spectrum Style
├── Performance
│   ├── CPU Limit
│   ├── Disk Cache
│   └── Auto-save Interval
└── Shortcuts
    └── Keyboard Mappings
```

### Panel-Specific Settings

**Each panel should have a settings icon (⚙️) that opens a dropdown/modal with:**
- Display options (waveform style, meter mode, etc.)
- Behavior options (auto-scroll, snap-to-grid, etc.)
- Layout options (compact/expanded view)

## Status Bar Architecture (CRITICAL FIX)

### Current Problem
Status bars show static text, not dynamic state

### Solution: Dynamic Status Components

**Pattern:**
```typescript
getSubtitle: () => {
    const { state } = useAudioEngine(); // Access from context
    return `${state.activeCount} active • ${state.cpu}% CPU`;
}
```

**But this won't work in config file!** Need different approach:

**Option 1: Move subtitle to Panel component**
- Panel reads from AudioEngineContext
- Displays dynamic subtitle based on panel type

**Option 2: Status bar component per panel**
- Each panel exports a StatusBar component
- PanelGrid renders it in subtitle area

## Color System

### Semantic Colors
- **Primary (Cyan)**: Active states, selected items, playhead
- **Secondary (Purple)**: Accents, gradients, highlights
- **Success (Green)**: Safe levels, enabled states
- **Warning (Yellow)**: Moderate levels, caution
- **Danger (Red)**: Clipping, errors, critical levels
- **Muted**: Inactive, disabled, background

### Level Indicators
- **Green**: -96 to -12 dB (safe)
- **Yellow**: -12 to -3 dB (moderate)
- **Red**: -3 to 0 dB (hot)
- **Clip**: 0+ dB (clipping)

## Next Steps

1. **Build Global Settings Panel** (new component)
2. **Rebuild Mixer Panel** with Faders + Knobs + Meters
3. **Rebuild Effects Panel** with Knobs in grid layout
4. **Rebuild Synthesis Panel** with Knobs in grid layout
5. **Add Settings Icons** to all panels
6. **Implement Dynamic Subtitles** via context
7. **Create Shared Control Groups** (reusable parameter sections)

