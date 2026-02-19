# AI Two-Stage Architecture

## Overview

The AI agent uses a **two-stage approach** for all requests:

1. **STAGE 1 (PLANNING)**: Analyze request + DAW state → Generate detailed execution plan
2. **STAGE 2 (EXECUTION)**: Execute plan with tool calls

This architecture ensures complete workflows, prevents empty tracks, and enforces proper sequencing of actions.

---

## Why Two-Stage?

### Problems with Single-Stage (ReAct)
- ❌ AI skips steps (creates tracks without clips)
- ❌ Incomplete workflows (forgets to add effects)
- ❌ Hard to enforce constraints
- ❌ No visibility into AI's reasoning

### Benefits of Two-Stage (Plan → Execute)
- ✅ Explicit planning phase catches incomplete workflows
- ✅ Plan can be validated before execution
- ✅ Better constraint enforcement (e.g., "always add clips to tracks")
- ✅ User can see the plan before execution
- ✅ More reliable for complex multi-step tasks
- ✅ Easier to debug (plan vs execution failures)

---

## Architecture Flow

```
User Request
    ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: PLANNING (LLM Call #1)                            │
│                                                             │
│ Input:                                                      │
│   - User request                                            │
│   - Current DAW state (sequences, tracks, clips, effects)  │
│   - Available instruments and effects                      │
│                                                             │
│ Output:                                                     │
│   - Detailed step-by-step plan                             │
│   - Specific parameters for each action                    │
│   - Musical reasoning                                       │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: EXECUTION (LLM Call #2)                           │
│                                                             │
│ Input:                                                      │
│   - The generated plan (from Stage 1)                      │
│   - Current DAW state                                       │
│   - Tool definitions                                        │
│                                                             │
│ Output:                                                     │
│   - Tool calls (create_track, create_midi_clip, etc.)     │
│   - Execution results                                       │
└─────────────────────────────────────────────────────────────┘
    ↓
Auto-save Composition as Iteration
    ↓
Return Response to User
```

---

## Stage 1: Planning

### Planning Prompt Structure

```
You are a music production AI in PLANNING mode.

PLANNING GUIDELINES:
1. Understand the request holistically
2. Analyze current state
3. Generate COMPLETE workflow
4. Be SPECIFIC with musical content

OUTPUT FORMAT:
**ANALYSIS:** [Brief analysis]
**PLAN:**
Step 1: create_track - Create "Kick Drum" track
  - name: "Kick Drum"
  - type: "midi"
  - instrument: "kick"
  
Step 2: create_midi_clip - Add kick pattern
  - track_id: [from Step 1]
  - start_time: 0
  - duration: 4
  - notes: [{n: 36, s: 0, d: 0.5, v: 110}, {n: 36, s: 2, d: 0.5, v: 110}]

Step 3: add_effect - Add reverb
  - track_id: [from Step 1]
  - effect_name: "reverb"

**MUSICAL REASONING:** [Why this achieves the goal]
```

### Key Features
- **No tool calling** - just text generation
- **Specific parameters** - exact MIDI notes, timing, values
- **Complete workflows** - never plans partial actions
- **Musical reasoning** - explains the creative decisions

---

## Stage 2: Execution

### Execution Prompt Structure

```
You are a music production AI in EXECUTION mode.

EXECUTION RULES:
1. Follow the plan step-by-step
2. Use the EXACT parameters specified
3. Don't skip steps or improvise
4. Complete workflows (create_track → create_midi_clip → add_effect)

CRITICAL:
🚨 EXECUTE THE ENTIRE PLAN
🚨 USE EXACT VALUES FROM PLAN
🚨 FOLLOW TOOL CALL ORDER

Execute now.
```

### Key Features
- **Tool calling enabled** - uses function calling
- **Plan injection** - the plan is injected into the prompt
- **Strict execution** - follows plan exactly
- **Validation** - logs track creation and clip addition

---

## Implementation Details

### File: `backend/services/ai_agent_service.py`

**Key Methods:**
- `send_message()` - Main entry point, orchestrates two stages
- `_build_planning_prompt()` - Generates Stage 1 prompt
- `_build_execution_prompt()` - Generates Stage 2 prompt
- `_save_ai_iteration()` - Auto-saves composition after execution

**Logging:**
- `🎯 STAGE 1: Planning` - Planning phase started
- `📋 Generated plan` - Shows the plan
- `⚡ STAGE 2: Executing` - Execution phase started
- `🎯 AI calling tool` - Each tool call
- `✅ Created track` - Track created
- `✅ Added clip to track` - Clip added to track
- `🚨 AI CREATED EMPTY TRACKS` - Violation detected
- `💾 Saved AI iteration` - Composition saved

---

## Auto-Save Iterations

After successful execution, the system automatically:
1. Builds a composition snapshot
2. Saves it with metadata:
   - `source: "ai_iteration"`
   - `user_message: "..."` - Original request
   - `actions_count: N` - Number of actions executed
   - `timestamp: "..."` - When it was created
3. Creates a history entry in `data/compositions/<id>/history/`

This ensures every AI action is versioned and can be undone.

---

## Response Format

```json
{
  "response": "**PLAN:**\n...\n\n**EXECUTION:**\n...\n\n**ACTIONS EXECUTED:** 3",
  "actions_executed": [...],
  "musical_context": "...",
  "plan": "..."
}
```

The frontend receives:
- Full response with plan and execution details
- List of executed actions
- Musical context (DAW state analysis)
- Separate plan text for display

