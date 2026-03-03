# Request Flow: "Rebuild the current composition to become an evolving ambient EDM piece"

A precise trace of every system boundary crossed from keypress to playback-ready state.

---

## 0. User Input (Frontend)

The user types in `AssistantChatLayout.tsx` and submits.

`dawStore.sendMessage(message)` is called. It reads AI preferences synchronously from
`useSettingsStore.getState()` — no hook, safe inside a Zustand action — collecting:

```
execution_model   → e.g. "sonnet"
temperature       → e.g. 0.7
response_style    → e.g. "balanced"
history_length    → e.g. 6
use_intent_routing → true
include_harmonic_context  → true
include_rhythmic_context  → true
include_timbre_context    → true
```

An optimistic `ChatMessage` (role=user) is appended to local state immediately, so the
UI shows the message before any network round-trip. Then:

```
POST /api/assistant/chat   (assistant.provider.ts → chat.py)
```

---

## 1. HTTP Layer (`backend/api/assistant/chat.py`)

`ChatRequest` is validated by Pydantic. The endpoint calls:

```python
ai_service.send_message(
    "Rebuild the current composition...",
    execution_model="sonnet",
    temperature=0.7,
    response_style="balanced",
    history_length=6,
    use_intent_routing=True,
    include_harmonic_context=True,
    include_rhythmic_context=True,
    include_timbre_context=True,
)
```

---

## 2. Pipeline Begins (`agent_service.py → send_message`)

A unique `request_id = "req-<timestamp_ms>"` is created for correlating all WebSocket
pipeline events for this request.

### 2a. Execution model resolution

`execution_model="sonnet"` maps through `_EXECUTION_MODEL_MAP`:

```
"sonnet" → "claude-sonnet-4-5-20250929"
```

---

## 3. Stage: context

**WebSocket broadcast** → `{stage: "context", status: "start"}`

`state_service.analyze_current_sequence()` is called first — forces a fresh key/scale
analysis so `state.musical` is never stale before the snapshot is taken.

`state_service.get_state(previous_hash=last_state_hash)` returns a `DAWStateSnapshot`
(compact representation):

```
sequence:
  tracks: [{id, name, instrument, clips: [{id, notes: [{n,s,d,v}...]}]}]
  tempo: 90
  time_signature: "4/4"
musical:
  key: "A"
  scale: "minor"
  chord_progression: ["Am", "F", "C", "G"]
  ...
```

`_build_context_message()` formats this into a text block, selectively including:
- Harmonic context: key, scale, chord analysis
- Rhythmic context: groove, timing feel, syncopation
- Timbre context: RMS energy, brightness per track

**WebSocket broadcast** → `{stage: "context", status: "complete", track_count: N, tempo: 90, key: "A minor"}`

---

## 4. Stage: routing (Haiku call #1)

**WebSocket broadcast** → `{stage: "routing", status: "start", model: "haiku"}`

`IntentRouter.route(user_message, daw_state_summary)` fires a minimal call to
`claude-haiku-4-5-20251001`:

```
max_tokens: 50
prompt:  "Classify this music production request into ONE category:
          ...
          User request: 'Rebuild the current composition to become an evolving ambient EDM piece'

          Respond with ONLY the category name."
```

Response: `"CREATE_ARRANGEMENT"`

`get_tools_for_intent(Intent.CREATE_ARRANGEMENT)` returns:

```python
["compose_music", "set_tempo"]
```

`get_system_prompt_for_intent(CREATE_ARRANGEMENT, ...)` returns a focused system prompt
that includes:
- Role declaration: "You are a music production AI. Create complete multi-track arrangements."
- Kit catalog (all available drum kits with IDs)
- Musical notation guide (C4=middle C, beat positions, chord symbols)
- Full instruments catalog grouped by role (Synths, Bass, Pads, Keys, etc.)
- Genre profiles summary (ambient: kit=ambient-kit, scale=major, bpm=90)
- Instruction to create drums + bass + chords in ONE compose_music call

`_RESPONSE_STYLE_APPENDIX["balanced"]` is not appended (balanced is the default — no
appendix needed).

**WebSocket broadcast** → `{stage: "routing", status: "complete", intent: "create_arrangement", tools_loaded: 2}`

---

## 5. Message History Construction

`_build_messages_with_history(user_message, context_message, history_length=6)` loads
the last 6 entries from `chat_histories[composition_id]` (in-memory per composition).

`_extract_duration_hints(user_message, tempo=90)` scans the message for duration cues
("8 bars", "one minute") and appends a hint like `\n[Duration hint: ~16 bars at 90 BPM]`.

Final messages array sent to Sonnet:

```
[
  {role: "user",      content: "<prior user message>"},
  {role: "assistant", content: "<prior AI response>"},
  ...
  {role: "user",      content: "Rebuild the current composition...\n\nCurrent DAW state:\n<context_message>"}
]
```

---

## 6. Stage: execution (Sonnet call)

**WebSocket broadcast** → `{stage: "execution", status: "start", model: "claude-sonnet-4-5-20250929", tool_count: 2}`

```python
client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=4096,
    temperature=0.7,
    system=<CREATE_ARRANGEMENT system prompt>,
    messages=[...history + current message...],
    tools=[COMPOSE_MUSIC_TOOL_SCHEMA, set_tempo_tool_def],
)
```

Sonnet reasons about the request, examines the existing composition in context, decides
on genre/key/tempo, and responds with a `tool_use` block:

```json
{
  "type": "tool_use",
  "name": "compose_music",
  "input": {
    "tempo": 90,
    "clear_existing": true,
    "tracks": [
      {
        "name": "Ambient Drums",
        "instrument": "kick808",
        "bars": 8,
        "kit_pattern": { "kit_id": "ambient-kit" },
        "effects": ["reverb"],
        "volume": 0.7
      },
      {
        "name": "Evolving Pad",
        "instrument": "PadWarmth",
        "bars": 8,
        "chord_pattern": {
          "chords": ["Am", "F", "C", "G"],
          "beats_per_chord": 8.0,
          "octave": 4,
          "voicing": "open",
          "velocity": 65
        },
        "effects": ["reverb", "delay"],
        "volume": 0.85
      },
      {
        "name": "Sub Bass",
        "instrument": "Bass808",
        "bars": 8,
        "note_sequence": [
          {"pitch": "A1", "beat": 0.0, "dur": 8.0, "vel": 90},
          {"pitch": "F1", "beat": 8.0, "dur": 8.0, "vel": 85},
          {"pitch": "C2", "beat": 16.0, "dur": 8.0, "vel": 88},
          {"pitch": "G1", "beat": 24.0, "dur": 8.0, "vel": 85}
        ],
        "effects": ["lpf"],
        "volume": 0.9
      },
      {
        "name": "Lead Texture",
        "instrument": "LeadShimmer",
        "bars": 8,
        "note_sequence": [
          {"pitch": "A5", "beat": 0.0, "dur": 2.0, "vel": 60},
          {"pitch": "C5", "beat": 2.0, "dur": 2.0, "vel": 55},
          ...
        ],
        "effects": ["reverb", "delay"],
        "volume": 0.6
      }
    ]
  }
}
```

**WebSocket broadcast** → `{stage: "execution", status: "complete", tool_calls: 1, stop_reason: "tool_use"}`

---

## 7. Stage: tools — `compose_music` execution

**WebSocket broadcast** → `{stage: "tools", status: "start", total: 1}`

`_dispatch_tool("compose_music", input)` routes to `ComposeTool.execute(params)`.

### 7a. Tempo + clear

```python
execute_action(DAWAction(action="set_tempo", parameters={"tempo": 90.0}))
execute_action(DAWAction(action="clear_composition", parameters={}))
```

`clear_composition` wipes `composition.tracks`, `composition.clips`,
`composition.track_effects` and returns `{tracks_removed: N, clips_removed: M}`.

### 7b. Per-track loop — for each track spec:

**Step 1: Create track**

```python
execute_action(DAWAction(action="create_track", parameters={
    "name": "Ambient Drums", "type": "midi", "instrument": "kick808"
}))
# → track_id = "trk-abc123"
```

Pydantic validates `instrument` against `ValidInstrument` (SYNTHDEF_REGISTRY). Invalid
instrument names are rejected here before any state mutation.

**Step 1b: Set volume** (if != 1.0)

```python
execute_action(DAWAction(action="set_track_parameter", parameters={
    "track_id": "trk-abc123", "parameter": "volume", "value": 0.7
}))
```

**Step 2: Generate MIDI notes**

Path depends on content type:

| Content type    | Handler                              | Music theory used                                          |
|-----------------|--------------------------------------|------------------------------------------------------------|
| `kit_pattern`   | `_generate_kit_pattern_notes()`      | `get_kit_by_id()` → `kit["demo"]` → unpack `[beat, midi, vel, dur]` × bars |
| `drum_pattern`  | `_generate_drum_pattern_notes()`     | `patterns.voice_to_midi_note()` → GM drum map              |
| `chord_pattern` | `_generate_chord_notes()`            | `theory.chord_progression_to_notes()` → chord intervals → MIDI |
| `note_sequence` | `_parse_note_sequence()`             | `theory.note_name_to_midi("A1")` → MIDI number 33          |

For `chord_pattern` with `["Am","F","C","G"]`, `beats_per_chord=8.0`, `octave=4`,
`voicing="open"`, `velocity=65`:

- `chord_progression_to_notes()` looks up `CHORD_INTERVALS["m"] = [0,3,7]` for "Am"
- Root A4 = MIDI 69; open voicing spreads notes across 2 octaves
- Each chord repeats for 8 beats; list repeats until total_beats = 32 (8 bars × 4)
- Result: list of `{n: int, s: float, d: float, v: int}` dicts

For `note_sequence` notes like `{"pitch": "A1", "beat": 0.0, "dur": 8.0, "vel": 90}`:

- `note_name_to_midi("A1")` → 33
- Invalid pitch names are skipped with a warning (no crash)

**Step 3: Apply kit** (for drum tracks)

```python
execute_action(DAWAction(action="set_drum_kit", parameters={
    "track_id": "trk-abc123", "kit_id": "ambient-kit"
}))
```

Sets `track.kit_id` and `track.kit` (the `KitPad` dict) from the registry. This routes
each MIDI note number to the correct drum voice synthdef at playback time.

**Step 4: Create MIDI clip**

```python
execute_action(DAWAction(action="create_midi_clip", parameters={
    "track_id": "trk-abc123",
    "start_time": 0.0,
    "duration": 32.0,   # 8 bars × 4 beats
    "notes": [{n:36, s:0.0, d:0.5, v:100}, ...],
    "name": "Ambient Drums Pattern"
}))
# → clip_id = "clip-def456"
```

**Step 5: Add effects**

```python
for effect_name in ["reverb", "delay"]:
    execute_action(DAWAction(action="add_effect", parameters={
        "track_id": "trk-abc123", "effect_name": effect_name
    }))
```

The above steps repeat for each of the 4 tracks.

**WebSocket broadcast** → `{stage: "tools", status: "complete", actions: [{name:"compose_music", success:true}], succeeded: 1, total: 1}`

---

## 8. Tool results → Haiku summary (Stage: summary)

`tool_results` is now populated:

```python
[{
    "type": "tool_result",
    "tool_use_id": "<block.id>",
    "content": "Success: Created 4 track(s): Ambient Drums (32 notes), Evolving Pad (16 notes), Sub Bass (4 notes), Lead Texture (12 notes)\nData: {tracks: [...]}"
}]
```

**WebSocket broadcast** → `{stage: "summary", status: "start", model: "haiku", tool_results: 1}`

Follow-up call to `claude-haiku-4-5-20251001` with `max_tokens=512`:

```
messages: [
  {role: "user",      content: "Rebuild the current composition..."},
  {role: "assistant", content: [<tool_use block>]},
  {role: "user",      content: [<tool_result>]}
]
```

Haiku produces a brief confirmation like:

> "I've rebuilt the composition as an evolving ambient EDM piece at 90 BPM in A minor.
> You now have four layers: soft kick pattern with reverb, open Am→F→C→G pad chords,
> a sustained sub bass following the chord roots, and a shimmering lead texture.
> Everything is drenched in space — try playing it back to feel the drift."

This text is appended to `assistant_message`.

**WebSocket broadcast** → `{stage: "summary", status: "complete", model: "haiku"}`

---

## 9. Auto-save iteration (`_save_ai_iteration`)

Because `len(actions_executed) > 0`:

1. Both user message and assistant response are appended to
   `chat_histories[composition_id]` in memory.
2. `composition_service.capture_composition_from_services()` snapshots the live state
   from composition_state_service + mixer_service + effects_service into a full
   `Composition` model.
3. Metadata is stamped: `{source: "ai_iteration", user_message: "Rebuild...", actions_count: N}`.
4. `composition_service.save_composition(create_history=True)` writes the JSON file and
   creates a history entry (enabling undo).

---

## 10. State hash update + response return

`last_state_hash` is updated to the new state hash so future calls can use diffs.

`send_message()` returns:

```python
{
    "response": "<Haiku summary text>",
    "actions_executed": [<ActionResult for compose_music>],
    "musical_context": "<context_message string>",
    "routing_intent": "create_arrangement",
}
```

**WebSocket broadcast** → `{stage: "response", status: "complete", actions: 1, has_tools: true}`

---

## 11. HTTP response + Frontend update

`chat.py` wraps the dict into `ChatResponse` and returns HTTP 200.

Back in `dawStore.sendMessage`:

1. Assistant `ChatMessage` is constructed with `routing_intent="create_arrangement"` and
   `musical_context` attached — visible in the `MusicalContextPanel`.
2. `get().addChatMessage(assistantMessage)` appends to `chatMessages` state.
3. If `aiAutoPlayAfterChanges` is true in settingsStore:
   ```
   api.playback.play()  →  POST /api/playback/play
   ```
4. `loadComposition(activeComposition.id)` reloads the full composition from backend
   (HTTP GET), replacing all tracks/clips/effects in Zustand state.
5. `refreshUndoRedoStatus()` checks backend for undo/redo availability.
6. The `SequencerTimeline` re-renders with 4 new tracks and their clips. The
   `AssistantChat` panel shows the Haiku response. If settings transparency is on,
   the routing badge shows `create_arrangement`.

---

## Summary: LLM calls made

| # | Model   | Purpose                     | max_tokens |
|---|---------|-----------------------------|------------|
| 1 | Haiku   | Intent routing              | 50         |
| 2 | Sonnet  | Composition generation      | 4096       |
| 3 | Haiku   | Tool-result acknowledgement | 512        |

Total: 3 LLM calls. The expensive Sonnet call only sees 2 tools (not all 20+), and its
system prompt is scoped to CREATE_ARRANGEMENT rather than a generic catch-all prompt.
