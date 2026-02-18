- volume control on track header seemingly has no effect
- metronome feature unselectable (cant turn it on) and doesnt work
- beats per minute adjustment has no effect and doesnt work
- opening up sequencer panel doesnt maintain state of opened piano roll or current clip selection
- Renaming a sample no longer works:
- - useSampleLibrary.ts:101 Failed to update sample: ReferenceError: sampleApi is not defined
    at useSampleLibrary.ts:92:13

- Shouldnt the sample editor also show the repeat loop selected area like the piano roll? WTF?!
- In the sample editor is it showing the complete sample and correspond to the clip length?
- When we add a sample to the timeline how much space is it (and more importantly "should it") tale up? What is the pattern for that, isnt the pattern that a clip would be added to the timeline at the length/size of the actual clip?
- 
- When we press play the Loop Region jumps to a different location, indicating you didnt make the loop region statefulness part of our cohesive state system and its persistence isnt loaded at start

- When we press play, the location indicator no longer moves at all, you broke it