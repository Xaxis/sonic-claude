- metronome feature unselectable (cant turn it on) and doesnt work
- beats per minute adjustment has no effect and doesnt work

- while sequencer playing horizontal scrolling should follow playhead position
- Update the dropdown component in the tracker head creating a "standard ui" component for dropdown "with search" common component and reimplement using that so we can search through instruments

- There are tons of disparate "local storage" key/value pairs and it is very disorganized and reflects how you didnt build a cohesive system for managing state on the fronntend and backend of the app. Critically examine 

- When we scroll the tracks on sequencer timeline (over the tracks header - that column) it doesnt vertically scroll the corresponding tracks in the timeline!

- Sample Editor in the sequencer is now completely broken, no double waveform, no grid, at least not visible.

- Future feature: sequencer "inline sample editing" track. Add a track, record a clip directly to that track, save/edit/the sample inline

- Recording samples is not working anymore!

- What happened to the preview waveform in the sample clips?

- Cant delete samples in sample library panel:
  useSampleLibrary.ts:124 Failed to delete sample: ReferenceError: sampleApi is not defined
  at useSampleLibrary.ts:116:13
  at onClick (SampleLibraryBrowser.tsx:221:60)