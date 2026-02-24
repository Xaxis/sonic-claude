- Find a better name than "Sonic Claude" and completely rename the project/references/copy/everything

- metronome feature unselectable (cant turn it on) and doesnt work
- beats per minute adjustment has no effect and doesnt work

- Update the dropdown component in the tracker head creating a "standard ui" component for dropdown "with search" common component and reimplement using that so we can search through instruments

- The sequencer "play ahead" line or whatever the fuck is called, is not animated smoothly, not sure if its because of performance issues recieving data, frontend poor choices, or both, but you need to completely refactor so that the timeline processing and interaction with that line is smooth and perfect without jankyness

- Work on/create beautiful "PERFORMANCE" tab and all associated brilliant integrated panels

- Future feature: sequencer "inline sample editing" track. Add a track, record a clip directly to that track, save/edit/the sample inline

- Work on MIDI hardware interface/map keyboard to real time piano roll

- Toasts dont work/arent visible across the board, arent consistently implemented

...
...

MAYBE:

- Now look at SettingsContext .... I could be wrong but it looks old, and lits its maintaining responsibilities that should have been placed elsewhere... though I could be wrong, I might be completely wrong. You need to make sure there are no conflated responsibilities and redundancies and that we are collosing and developing consistent best practice patterns as we continue to refactor

- Research "LLM music language", if midi or oscland or "life performance" language structures are right and building a proper "reference system" or whatever it takes to best suit LLMs to producing production quality music


...
...

- Input Panel "sample recording" not working. 
