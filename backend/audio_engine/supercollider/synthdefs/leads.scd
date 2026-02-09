// Lead SynthDefs
// Melodic lead instruments

// Pluck - Plucked string sound
SynthDef(\pluck, { |out=0, freq=440, amp=0.5, decay=2.0, coef=0.1|
    var sig, env;
    env = EnvGen.kr(Env.perc(0.001, decay), doneAction: 2);
    sig = Pluck.ar(WhiteNoise.ar(), 1, 1/freq, 1/freq, decay, coef);
    Out.ar(out, sig * env * amp ! 2);
}).add;

// Arp - Arpeggiator lead
SynthDef(\arp, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.2, cutoff=3000, resonance=0.3|
    var sig, env, filter;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    sig = Saw.ar(freq) + Pulse.ar(freq * 1.01, 0.5);
    filter = RLPF.ar(sig, cutoff, resonance);
    Out.ar(out, filter * env * amp * 0.5 ! 2);
}).add;

// Supersaw - Detuned saw lead
SynthDef(\supersaw, { |out=0, freq=440, amp=0.5, gate=1, attack=0.1, release=0.3, detune=5, cutoff=5000|
    var sig, env, filter;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    sig = Mix.ar(Array.fill(7, { |i|
        Saw.ar(freq * (1 + (((i - 3) * detune) / 100)))
    }));
    filter = LPF.ar(sig, cutoff);
    Out.ar(out, filter * env * amp * 0.15 ! 2);
}).add;

// Bell - Bell-like tone
SynthDef(\bell, { |out=0, freq=440, amp=0.5, decay=3.0|
    var sig, env;
    env = EnvGen.kr(Env.perc(0.01, decay), doneAction: 2);
    sig = SinOsc.ar(freq * [1, 2.4, 3.7, 5.2]).sum;
    Out.ar(out, sig * env * amp * 0.25 ! 2);
}).add;

// Sync lead - Hard sync lead
SynthDef(\synclead, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3, syncRatio=2|
    var sig, env;
    env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
    sig = SyncSaw.ar(freq, freq * syncRatio);
    Out.ar(out, sig * env * amp ! 2);
}).add;

