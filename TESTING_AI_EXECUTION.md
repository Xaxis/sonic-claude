# Testing Guide: AI Execution Fix

## Quick Test

1. **Start the backend:**
   ```bash
   cd backend
   python main.py
   ```

2. **Start the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Create a simple sequence:**
   - Open the app
   - Create a new sequence
   - Add a simple track with a basic MIDI clip (e.g., a sine wave playing C major chord)

4. **Test the AI with a complex request:**
   - Open the AI Assistant panel
   - Send: "Recompose this sequence to be more ambient and atmospheric"

5. **Check the logs:**
   Look for these log messages in the backend console:
   
   ```
   📋 Generated plan:
   [Should show 10-14 steps]
   
   ⚡ STAGE 2: Executing plan
   🔄 Execution turn 1/10
   🎯 AI calling tool: modify_clip with params: {...}
   🎯 AI calling tool: create_track with params: {...}
   🎯 AI calling tool: create_midi_clip with params: {...}
   ...
   
   📊 Turn 1 complete: 3 tools executed, 3 total actions
   🔄 Execution turn 2/10
   ...
   
   ✅ Execution complete after 3 turns: 14 total actions
   📊 Action summary: {'modify_clip': 1, 'create_track': 4, 'create_midi_clip': 4, 'add_effect': 5}
   ```

6. **Verify the UI:**
   - Check that new tracks appear in the sequencer
   - Check that clips are visible on the timeline
   - Check that effects are added to tracks
   - Play the sequence and verify it sounds more ambient

---

## Expected Results

### ✅ Success Indicators

- **Backend logs show:**
  - Multiple execution turns (2-5 turns typical)
  - 10+ actions executed
  - Action summary showing variety of actions
  - No "empty tracks" warnings

- **Frontend shows:**
  - "ACTIONS EXECUTED: 14" (or similar high number)
  - New tracks visible in sequencer
  - New clips on timeline
  - Effects visible in mixer/effects panel
  - Audio sounds significantly different

### ❌ Failure Indicators

- **Backend logs show:**
  - Only 1 execution turn
  - Only 1 action executed
  - "No actions were executed!" warning

- **Frontend shows:**
  - "ACTIONS EXECUTED: 1"
  - No visible changes to sequence
  - Audio sounds the same

---

## Debugging

### If only 1 action executes:

1. **Check Claude API response:**
   - Look for the first API call in logs
   - Verify Claude is returning tool calls
   - Check if there are any API errors

2. **Check execution prompt:**
   - Verify the prompt emphasizes executing ALL steps
   - Check if the plan is being passed correctly

3. **Check multi-turn loop:**
   - Verify the while loop is running
   - Check if `tool_calls_made` is being set correctly
   - Verify messages are being appended correctly

### If no actions execute:

1. **Check planning stage:**
   - Verify a plan is being generated
   - Check if the plan has actual steps

2. **Check tool definitions:**
   - Verify tools are being passed to Claude
   - Check if tool schemas are valid

---

## Advanced Testing

### Test different request types:

1. **Vague creative requests:**
   - "Make this more energetic"
   - "Add some tension"
   - "Transform this into jazz"

2. **Specific requests:**
   - "Add a kick drum on beats 1 and 3"
   - "Add reverb to all tracks"
   - "Change tempo to 140 BPM"

3. **Complex transformations:**
   - "Recompose as a drum and bass track"
   - "Add a melodic bassline in D minor"
   - "Create a build-up section"

### Expected behavior:

- **Vague requests:** Should generate 10-20 actions (creative interpretation)
- **Specific requests:** Should generate 1-5 actions (targeted changes)
- **Complex transformations:** Should generate 15-30 actions (major overhaul)

---

## Performance Monitoring

### Execution time:

- **Planning stage:** 2-5 seconds
- **Execution stage:** 5-15 seconds (depends on number of turns)
- **Total:** 7-20 seconds for complex requests

### API usage:

- **Planning:** 1 API call
- **Execution:** 2-5 API calls (multi-turn)
- **Total:** 3-6 API calls per request

---

## Rollback Plan

If the fix causes issues, revert with:

```bash
git checkout HEAD -- backend/services/ai_agent_service.py
```

Then restart the backend.

