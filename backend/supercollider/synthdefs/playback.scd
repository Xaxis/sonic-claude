/*
 * Playback SynthDefs
 *
 * SynthDefs for sample playback and utility sounds:
 * - samplePlayer: Audio sample playback with pitch, rate, trim, fade, reverse, loop
 * - metronome:    Click track for tempo reference
 *
 * samplePlayer parameters:
 *   out      - output bus (default 0)
 *   bufnum   - buffer number
 *   rate     - playback rate multiplier (1.0 = normal, 0.5 = half speed, 2.0 = double)
 *              Combine pitch shift and speed here: rate = speed * 2^(semitones/12)
 *   amp      - amplitude (0.0-2.0, 1.0 = unity)
 *   gate     - envelope gate (1 = playing, set to 0 to trigger release)
 *   loop     - 0 = one-shot (frees on buffer end), 1 = loop (frees on gate release)
 *   startPos - normalized start position in buffer [0.0-1.0] (for trim start)
 *   endPos   - normalized end position in buffer [0.0-1.0] (used as reverse start)
 *   fadeIn   - fade in / attack time in seconds (min ~0.005 to avoid clicks)
 *   fadeOut  - fade out / release time in seconds
 *   reverse  - 0 = forward, 1 = reverse (plays from endPos backwards)
 */

(
SynthDef(\samplePlayer, { |out=0, bufnum=0, rate=1.0, amp=1.0, gate=1, loop=0,
                           startPos=0.0, endPos=1.0, fadeIn=0.01, fadeOut=0.05, reverse=0|
    var bufFrames = BufFrames.kr(bufnum);
    // BufRateScale compensates for buffer's sample rate vs server sample rate
    var playRate = BufRateScale.kr(bufnum) * rate * Select.kr(reverse, [1.0, -1.0]);
    // Forward play: start at startPos; reverse play: start at endPos (plays backward)
    var startFrame = Select.kr(reverse, [startPos, endPos]) * bufFrames;
    // doneAction logic:
    //   One-shot (loop=0): PlayBuf frees node when buffer end is reached (doneAction 2)
    //   Looped  (loop=1): PlayBuf loops indefinitely (doneAction 0); envelope frees it on gate release
    var sig = PlayBuf.ar(2, bufnum, playRate, 1, startFrame, loop,
        doneAction: Select.kr(loop, [2, 0]));
    // ASR envelope: attack=fadeIn, sustain=1.0, release=fadeOut
    // doneAction 2 frees the node after release phase completes (handles looped + one-shot cleanly)
    var env = EnvGen.kr(Env.asr(fadeIn, 1.0, fadeOut), gate, doneAction: 2);
    Out.ar(out, sig * env * amp);
}).add;

// Metronome - simple click sound for tempo reference
SynthDef(\metronome, { |out=0, freq=1000, amp=0.5, accent=0|
    var env = EnvGen.kr(Env.perc(0.001, 0.05), doneAction: 2);
    var sig = SinOsc.ar(freq * (1 + accent)) * env * amp;
    Out.ar(out, [sig, sig]);
}).add;

"✅ Playback SynthDefs loaded".postln;
"   samplePlayer: Audio sample playback (pitch, rate, trim, fade, reverse, loop)".postln;
"   metronome: Click track".postln;
)

