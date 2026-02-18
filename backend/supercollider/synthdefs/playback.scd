/*
 * Playback SynthDefs
 * 
 * SynthDefs for sample playback and utility sounds:
 * - samplePlayer: Audio sample playback with looping
 * - metronome: Click track for tempo reference
 */

(
// Sample Player - plays audio samples with looping support
SynthDef(\samplePlayer, { |out=0, bufnum=0, rate=1, amp=0.5, gate=1, attack=0.01, release=0.1, loop=0, startPos=0|
    var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    var sig = PlayBuf.ar(2, bufnum, BufRateScale.kr(bufnum) * rate, 1, startPos * BufFrames.kr(bufnum), loop);
    sig = sig * env * amp;
    Out.ar(out, sig);
}).add;

// Metronome - simple click sound for tempo reference
SynthDef(\metronome, { |out=0, freq=1000, amp=0.5, accent=0|
    var env = EnvGen.kr(Env.perc(0.001, 0.05), doneAction: 2);
    var sig = SinOsc.ar(freq * (1 + accent)) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

"✅ Playback SynthDefs loaded".postln;
"   samplePlayer: Audio sample playback".postln;
"   metronome: Click track".postln;
)

