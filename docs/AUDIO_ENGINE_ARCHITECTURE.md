# Sonic Claude Audio Engine Architecture

## Overview
A professional, modular audio engine built on SuperCollider for live AI-controlled music performance. Designed for real-time LLM interaction, low latency, and complete programmatic control.

---

## Core Principles

1. **Non-Monolithic Design** - Each service has a single, well-defined responsibility
2. **Real-Time Performance** - Sub-10ms latency for live performance
3. **LLM-First** - Every parameter and control is designed for AI manipulation
4. **Mathematical Representation** - Music as executable code and data structures
5. **Live Coding Ready** - Hot-swappable code, real-time parameter changes
6. **Production Quality** - Professional audio routing, mixing, and effects

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI REST/WebSocket                   │
│                    (Python Backend Layer)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Audio Engine Services                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Synthesis  │  │   Effects    │  │    Mixer     │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Sequencer   │  │  Sampler     │  │  Analysis    │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              SuperCollider Communication Layer               │
│                    (python-sc3 / OSC)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   SuperCollider Server                       │
│                      (scsynth / supernova)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Service Architecture

### 1. **Core Audio Engine Service**
**Responsibility**: Manage SuperCollider server lifecycle and core audio routing

**Key Components**:
- `AudioEngineManager` - Server startup, shutdown, health monitoring
- `AudioBusManager` - Audio bus allocation and routing
- `ControlBusManager` - Control bus for parameter modulation
- `GroupManager` - Node group hierarchy management

**API**:
```python
class AudioEngineManager:
    async def start(self, sample_rate: int = 48000, block_size: int = 64)
    async def stop()
    async def get_status() -> EngineStatus
    async def allocate_audio_bus(channels: int = 2) -> AudioBus
    async def allocate_control_bus() -> ControlBus
    async def create_group(target: Group, position: str = "tail") -> Group
```

---

### 2. **Synthesis Service**
**Responsibility**: Manage synth definitions and voice allocation

**Key Components**:
- `SynthDefManager` - Load, compile, and manage SynthDefs
- `VoiceAllocator` - Polyphonic voice management
- `InstrumentLibrary` - Preset instruments and patches

**API**:
```python
class SynthesisService:
    async def load_synthdef(name: str, definition: str)
    async def create_synth(synthdef: str, params: Dict) -> Synth
    async def play_note(instrument: str, note: int, velocity: float, duration: float)
    async def set_parameter(synth_id: int, param: str, value: float)
    async def release_synth(synth_id: int)
```

**Built-in Instruments**:
- Subtractive synths (saw, square, triangle, sine)
- FM synthesis
- Wavetable synthesis
- Physical modeling (Karplus-Strong, modal synthesis)
- Granular synthesis

---

### 3. **Effects Service**
**Responsibility**: Audio effects processing and routing

**Key Components**:
- `EffectChainManager` - Serial/parallel effect routing
- `EffectLibrary` - Built-in effects (reverb, delay, filters, etc.)
- `SendReturnManager` - Aux send/return buses

**API**:
```python
class EffectsService:
    async def create_effect(effect_type: str, params: Dict) -> Effect
    async def add_to_chain(track_id: str, effect: Effect, position: int)
    async def set_effect_param(effect_id: int, param: str, value: float)
    async def create_send(name: str) -> SendBus
    async def set_send_level(track_id: str, send_id: str, level: float)
```

**Built-in Effects**:
- Reverb (algorithmic, convolution)
- Delay (stereo, ping-pong, tape)
- Filters (LP, HP, BP, notch, comb)
- Distortion (soft clip, hard clip, waveshaping)
- Modulation (chorus, flanger, phaser)
- Dynamics (compressor, limiter, gate, expander)
- Spatial (panner, stereo width, binaural)

---

### 4. **Mixer Service**
**Responsibility**: Track management, routing, and master output

**Key Components**:
- `TrackManager` - Audio/MIDI track management
- `MixerBus` - Per-track mixing (volume, pan, mute, solo)
- `MasterBus` - Master output processing

**API**:
```python
class MixerService:
    async def create_track(name: str, type: TrackType) -> Track
    async def set_volume(track_id: str, volume: float)  # 0.0-2.0
    async def set_pan(track_id: str, pan: float)  # -1.0 to 1.0
    async def mute(track_id: str, muted: bool)
    async def solo(track_id: str, soloed: bool)

---

### 5. **Sequencer Service**
**Responsibility**: Timeline playback, MIDI sequencing, and pattern generation

**Key Components**:
- `TimelineEngine` - Timeline playback with clips and automation
- `PatternSequencer` - Step sequencer and pattern-based sequencing
- `MIDIRouter` - MIDI event routing and transformation
- `QuantizationEngine` - Rhythmic quantization and groove

**API**:
```python
class SequencerService:
    async def create_sequence(name: str, tempo: float, time_signature: str) -> Sequence
    async def add_clip(sequence_id: str, track_id: str, clip: Clip)
    async def play_sequence(sequence_id: str, loop: bool = True)
    async def stop_sequence(sequence_id: str)
    async def set_tempo(tempo: float)
    async def set_playhead(position: float)  # In beats
    async def schedule_note(time: float, note: MIDINote)
    async def create_pattern(steps: List[Step], length: int) -> Pattern
```

**Features**:
- Sample-accurate timing
- Swing and groove quantization
- Automation curves (volume, pan, parameters)
- Loop points and markers
- MIDI CC automation

---

### 6. **Sampler Service**
**Responsibility**: Sample playback, manipulation, and stem management

**Key Components**:
- `SampleLoader` - Load and cache audio samples
- `SamplePlayer` - Multi-voice sample playback
- `StemManager` - Manage separated audio stems
- `TimeStretch` - Time-stretching and pitch-shifting

**API**:
```python
class SamplerService:
    async def load_sample(path: str) -> Sample
    async def play_sample(sample_id: str, params: PlaybackParams)
    async def set_playback_rate(sample_id: str, rate: float)
    async def set_loop_points(sample_id: str, start: float, end: float)
    async def load_stem(stem_type: StemType, audio_data: np.ndarray) -> Stem
    async def play_stem(stem_id: str, sync_to_tempo: bool = True)
```

---

### 7. **Analysis Service**
**Responsibility**: Real-time audio analysis and feature extraction

**Key Components**:
- `SpectrumAnalyzer` - FFT analysis and spectral features
- `OnsetDetector` - Beat and onset detection
- `PitchTracker` - Fundamental frequency tracking
- `LoudnessAnalyzer` - RMS, peak, LUFS measurement

**API**:
```python
class AnalysisService:
    async def get_spectrum(bus_id: str, bins: int = 512) -> np.ndarray
    async def get_rms(bus_id: str) -> float
    async def detect_onsets(audio: np.ndarray) -> List[float]
    async def track_pitch(audio: np.ndarray) -> List[Tuple[float, float]]
    async def analyze_loudness(bus_id: str) -> LoudnessMetrics
```

---

## Data Models

### Core Types
```python
@dataclass
class EngineStatus:
    running: bool
    sample_rate: int
    block_size: int
    cpu_usage: float
    active_synths: int
    active_groups: int

@dataclass
class AudioBus:
    id: int
    channels: int
    rate: str  # "audio" or "control"

@dataclass
class Synth:
    id: int
    synthdef: str
    group: int
    parameters: Dict[str, float]

@dataclass
class Track:
    id: str
    name: str
    type: TrackType  # AUDIO, MIDI, AUX
    bus: AudioBus
    volume: float
    pan: float
    muted: bool
    soloed: bool
    effects: List[Effect]

@dataclass
class Clip:
    id: str
    track_id: str
    start_time: float  # In beats
    duration: float
    content: Union[MIDIClip, AudioClip]

@dataclass
class MIDINote:
    note: int  # 0-127
    velocity: float  # 0.0-1.0
    duration: float  # In beats
    time: float  # In beats

@dataclass
class Effect:
    id: int
    type: str
    parameters: Dict[str, float]
    bypass: bool
```

---

## SuperCollider Integration

### Communication Protocol
- **Python → SuperCollider**: OSC messages via `python-sc3` or `python-osc`
- **SuperCollider → Python**: OSC callbacks for analysis data and events
- **Latency**: < 5ms round-trip for parameter changes

### SynthDef Architecture
All SynthDefs follow a standard template:
```supercollider
SynthDef(\templateSynth, {
    arg out=0, freq=440, amp=0.5, gate=1,
        attack=0.01, decay=0.1, sustain=0.7, release=0.3,
        cutoff=2000, resonance=0.5;

    var sig, env, filter;

    // Envelope
    env = EnvGen.kr(Env.adsr(attack, decay, sustain, release), gate, doneAction: 2);

    // Oscillator
    sig = Saw.ar(freq);

    // Filter
    filter = RLPF.ar(sig, cutoff, resonance);

    // Output
    Out.ar(out, filter * env * amp ! 2);
}).add;
```

### Node Tree Structure
```
Group 0 (Root)
├── Group 1 (Synths)
│   ├── Synth: kick
│   ├── Synth: bass
│   └── Synth: lead
├── Group 2 (Track Effects)
│   ├── Synth: reverb_send_1
│   └── Synth: delay_send_1
└── Group 3 (Master)
    ├── Synth: master_compressor
    └── Synth: master_limiter
```

---

## LLM Integration Points

### 1. **Musical Decision Making**
LLM can control:
- Tempo, key, scale, time signature
- Arrangement (intro, verse, chorus, drop, outro)
- Intensity (0-10 scale maps to synth complexity, filter cutoff, reverb)
- Harmonic progression
- Rhythmic patterns

### 2. **Code Generation**
LLM generates:
- SuperCollider SynthDef code
- Pattern sequences
- Effect chains
- Automation curves

### 3. **Real-Time Manipulation**
LLM responds to:
- Audio analysis (energy, brightness, rhythm)
- User chat commands
- Transcription results
- Timeline events

### Example LLM → Audio Engine Flow:
```
User: "Make it more energetic!"
  ↓
LLM analyzes current state
  ↓
LLM decides: increase tempo, add high-pass filter, increase reverb
  ↓
LLM generates parameter changes:
  - set_tempo(135)  # was 120
  - set_effect_param(filter_id, "cutoff", 2000)  # was 800
  - set_effect_param(reverb_id, "mix", 0.4)  # was 0.2
  ↓
Audio Engine executes changes in real-time
  ↓
Music becomes more energetic!
```

---

## File Structure

```
backend/
├── audio_engine/
│   ├── __init__.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── engine_manager.py      # Core engine lifecycle
│   │   ├── bus_manager.py         # Audio/control bus management
│   │   └── group_manager.py       # Node group management
│   ├── services/
│   │   ├── __init__.py
│   │   ├── synthesis_service.py   # Synth management
│   │   ├── effects_service.py     # Effects processing
│   │   ├── mixer_service.py       # Mixing and routing
│   │   ├── sequencer_service.py   # Timeline/sequencing
│   │   ├── sampler_service.py     # Sample playback
│   │   └── analysis_service.py    # Audio analysis
│   ├── models/
│   │   ├── __init__.py
│   │   ├── engine.py              # Engine data models
│   │   ├── synth.py               # Synth data models
│   │   ├── track.py               # Track/mixer models
│   │   └── sequence.py            # Sequencer models
│   ├── supercollider/
│   │   ├── __init__.py
│   │   ├── sc_client.py           # SuperCollider communication
│   │   ├── synthdefs/             # SynthDef library
│   │   │   ├── drums.scd
│   │   │   ├── bass.scd
│   │   │   ├── leads.scd
│   │   │   └── effects.scd
│   │   └── boot.scd               # Server boot configuration
│   └── routes/
│       ├── __init__.py
│       ├── engine.py              # Engine control endpoints
│       ├── synthesis.py           # Synth endpoints
│       ├── mixer.py               # Mixer endpoints
│       └── sequencer.py           # Sequencer endpoints
```

---

## Implementation Phases

### Phase 1: Core Engine (Week 1)
- [ ] SuperCollider server management
- [ ] Bus and group allocation
- [ ] Basic synth playback
- [ ] Health monitoring

### Phase 2: Synthesis & Effects (Week 2)
- [ ] SynthDef library (10+ instruments)
- [ ] Voice allocation
- [ ] Effect chain routing
- [ ] Built-in effects (reverb, delay, filter)

### Phase 3: Mixer & Routing (Week 3)
- [ ] Track management
- [ ] Volume/pan/mute/solo
- [ ] Send/return buses
- [ ] Master bus processing

### Phase 4: Sequencer (Week 4)
- [ ] Timeline playback
- [ ] MIDI clip support
- [ ] Pattern sequencer
- [ ] Automation

### Phase 5: Integration (Week 5)
- [ ] LLM agent integration
- [ ] Transcription → playback
- [ ] Real-time parameter control
- [ ] Frontend updates

---

## Performance Targets

- **Latency**: < 10ms input to output
- **CPU Usage**: < 30% on modern hardware
- **Polyphony**: 64+ simultaneous voices
- **Sample Rate**: 48kHz (configurable)
- **Bit Depth**: 24-bit
- **Buffer Size**: 64-256 samples (configurable)

---

## Dependencies

```python
# requirements.txt additions
supercollider==0.0.5  # Python SuperCollider client
python-osc==1.8.3     # OSC communication (already installed)
```

---

## Next Steps

1. ✅ Architecture designed
2. ⏳ Implement core engine manager
3. ⏳ Create basic SynthDef library
4. ⏳ Build synthesis service
5. ⏳ Integrate with existing services


