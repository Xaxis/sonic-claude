- Find a better name than "Sonic Claude" and completely rename the project/references/copy/everything

- ~~beats per minute adjustment has no effect~~ FIXED: `setTempo` now calls `api.playback.setTempo()` before persisting to composition metadata

- ~~Update the dropdown component in the tracker head~~ FIXED: `SequencerInstrumentSelector` now uses `SearchableDropdown` component with full search/filter

- Future feature: sequencer "inline sample editing" track. Add a track, record a clip directly to that track, save/edit/the sample inline

- Work on MIDI hardware interface/map keyboard to real time piano roll

- ~~Toasts dont work/arent visible~~ FIXED: Added Sonner `<Toaster>` to `main.tsx`; all `toast.*` calls from store/hooks now render correctly

...

- Implement "mimic" feature into analysis/ai chain, ability for ai system to listen to a composition, track, clip or audio sample, etc, and mimic it's style, essence, etc.
