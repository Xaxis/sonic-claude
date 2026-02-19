- metronome feature unselectable (cant turn it on) and doesnt work
- beats per minute adjustment has no effect and doesnt work

- while sequencer playing horizontal scrolling should follow playhead position
- Update the dropdown component in the tracker head creating a "standard ui" component for dropdown "with search" common component and reimplement using that so we can search through instruments

- The sequencer "play ahead" line or whatever the fuck is called, is not animated smoothly, not sure if its because of performance issues recieving data, frontend poor choices, or both, but you need to completely refactor so that the timeline processing and interaction with that line is smooth and perfect without jankyness

- There are tons of disparate "local storage" key/value pairs and it is very disorganized and reflects how you didnt build a cohesive system for managing state on the fronntend and backend of the app. Critically examine 

- When we scroll the tracks on sequencer timeline (over the tracks header - that column) it doesnt vertically scroll the corresponding tracks in the timeline!

- Work on/create beautiful "PERFORMANCE" tab and all associated brilliant integrated panels

- Future feature: sequencer "inline sample editing" track. Add a track, record a clip directly to that track, save/edit/the sample inline

- Whats up with data/mixer?! Shoulnd that state have been built into the sequences in our consistent pattern

- Implement "x-ray" mode, so if youre in a given tab, you can "x-ray", transparently see through to another tab behind it

- What do you mean our backend ai analysis only occurs on MIDI changes? What does that mean? What does that translate to on our frontend? Are you sure thats the right way to do this, are you missing anything?

- You built the ai chat/system for the user to "be specific", and thats fine, but I think you completely missed a core premise: of how it was supposed to be architected, its not supposed to only enforce a user being specific, its supposed to be able to accept vague commands and be creative? Eg "Recompose the entire sequence to be more ambient" etc etc etc and for the creative intelligence to take over, adjust the sequence (Creating a new (reversible) iteration) that the user can then listen to, and that is just the composition aspect, we will get to the perforamnce aspect later on

- Work on MIDI hardware interface/map keyboard to real time piano roll