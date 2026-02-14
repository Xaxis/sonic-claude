/*
 * OSC Relay for Sonic Claude
 *
 * CORRECT ARCHITECTURE (based on scsynth.org forum research):
 * - Uses Buffer + BufWr for audio data storage
 * - Uses SendReply ONLY to signal when data is ready
 * - Uses Buffer.getn() to retrieve data (NOT loadToFloatArray)
 * - Uses partitioning to avoid read/write conflicts
 *
 * Flow:
 *   scsynth (SendReply signals) → sclang (this script retrieves buffer data) → Python (via OSC)
 *
 * Port allocation:
 *   57110 - scsynth command port (Python → scsynth)
 *   57120 - sclang listening port (scsynth → sclang) - DEFAULT
 *   57121 - Python listening port (sclang → Python)
 */

(
// Connect to existing scsynth server (don't boot a new one)
Server.default = s = Server.remote(\sonicClaude, NetAddr("127.0.0.1", 57110));

"🔗 Connecting to existing scsynth on port 57110...".postln;

// Notify the server (enables status updates)
s.notify;

// Use a Routine to allow waiting
Routine({
    var chunkSize = 1024;
    var numChunks = 8;

    // Give server a moment to connect
    0.5.wait;

    "🔗 OSC Relay starting...".postln;
    "   Server connected, loading SynthDefs...".postln;

    // Allocate buffers
    ~waveformBuffer = Buffer.alloc(s, chunkSize * numChunks, 1);
    ~spectrumBuffer = Buffer.alloc(s, chunkSize * numChunks, 1);

    s.sync;

    "✅ Buffers allocated:".postln;
    "   Waveform: % (ID: %)".format(chunkSize * numChunks, ~waveformBuffer.bufnum).postln;
    "   Spectrum: % (ID: %)".format(chunkSize * numChunks, ~spectrumBuffer.bufnum).postln;

    // Define SynthDefs
    SynthDef(\audioMonitor, { |targetBus=0, waveformBuf, spectrumBuf, sendRate=60|
        var sig, mono, phase, trig, partition, meterTrig, left, right, peakL, peakR, rmsL, rmsR;

        sig = In.ar(targetBus, 2);
        mono = Mix.ar(sig) * 0.5;

        // Waveform capture (Python will do FFT on this data)
        phase = Phasor.ar(0, 1, 0, chunkSize);
        trig = HPZ1.ar(phase) < 0;
        partition = PulseCount.ar(trig) % numChunks;

        BufWr.ar(mono, waveformBuf, phase + (chunkSize * partition));
        SendReply.ar(trig, '/buffer_ready', [partition, waveformBuf, chunkSize, numChunks]);

        // Meters
        meterTrig = Impulse.kr(sendRate);
        left = sig[0];
        right = sig[1];
        peakL = Peak.ar(left, meterTrig).lag(0.1);
        peakR = Peak.ar(right, meterTrig).lag(0.1);
        rmsL = RunningSum.ar(left.squared, 48000 / sendRate).sqrt;
        rmsR = RunningSum.ar(right.squared, 48000 / sendRate).sqrt;

        SendReply.kr(meterTrig, '/meter', [peakL, peakR, rmsL, rmsR]);
    }).add;

    // Audio Input Monitor - captures from microphone/line-in
    SynthDef(\audioInputMonitor, { |inputChannel=0, waveformBuf, spectrumBuf, sendRate=60|
        var sig, mono, phase, trig, partition, meterTrig, left, right, peakL, peakR, rmsL, rmsR;

        // Capture from audio input (SoundIn)
        sig = SoundIn.ar([inputChannel, inputChannel + 1]);
        mono = Mix.ar(sig) * 0.5;

        // Waveform capture (Python will do FFT on this data)
        phase = Phasor.ar(0, 1, 0, chunkSize);
        trig = HPZ1.ar(phase) < 0;
        partition = PulseCount.ar(trig) % numChunks;

        BufWr.ar(mono, waveformBuf, phase + (chunkSize * partition));
        SendReply.ar(trig, '/input_buffer_ready', [partition, waveformBuf, chunkSize, numChunks]);

        // Meters
        meterTrig = Impulse.kr(sendRate);
        left = sig[0];
        right = sig[1];
        peakL = Peak.ar(left, meterTrig).lag(0.1);
        peakR = Peak.ar(right, meterTrig).lag(0.1);
        rmsL = RunningSum.ar(left.squared, 48000 / sendRate).sqrt;
        rmsR = RunningSum.ar(right.squared, 48000 / sendRate).sqrt;

        SendReply.kr(meterTrig, '/input_meter', [peakL, peakR, rmsL, rmsR]);
    }).add;

    SynthDef(\sine, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3|
        var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
        var sig = SinOsc.ar(freq) * env * amp;
        Out.ar(out, [sig, sig]);
    }).add;

    SynthDef(\saw, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3, cutoff=2000|
        var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
        var sig = Saw.ar(freq) * env * amp;
        sig = LPF.ar(sig, cutoff);
        Out.ar(out, [sig, sig]);
    }).add;

    SynthDef(\square, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.3, width=0.5|
        var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
        var sig = Pulse.ar(freq, width) * env * amp;
        Out.ar(out, [sig, sig]);
    }).add;

    SynthDef(\samplePlayer, { |out=0, bufnum, rate=1, amp=0.5, pan=0, startPos=0, loop=0, gate=1, attack=0.01, release=0.1|
        var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
        var sig = PlayBuf.ar(
            numChannels: 2,
            bufnum: bufnum,
            rate: rate * BufRateScale.kr(bufnum),
            trigger: 1,
            startPos: startPos * BufFrames.kr(bufnum),
            loop: loop,
            doneAction: if(loop == 0, 2, 0)
        );
        sig = sig * env * amp;
        sig = Balance2.ar(sig[0], sig[1], pan);
        Out.ar(out, sig);
    }).add;

    SynthDef(\metronome, { |out=0, freq=1000, amp=0.3, accent=0|
        var env = EnvGen.kr(Env.perc(0.001, 0.05), doneAction: 2);
        var sig = SinOsc.ar(if(accent > 0, freq * 2, freq)) * env * amp;
        Out.ar(out, [sig, sig]);
    }).add;

    // FM Synth - Frequency modulation synthesis
    SynthDef(\fm, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, decay=0.3, sustain=0.7, release=0.5, modRatio=2.0, modIndex=2.0|
        var env = EnvGen.kr(Env.adsr(attack, decay, sustain, release), gate, doneAction: 2);
        var modulator = SinOsc.ar(freq * modRatio) * freq * modIndex;
        var carrier = SinOsc.ar(freq + modulator);
        var sig = carrier * env * amp;
        Out.ar(out, [sig, sig]);
    }).add;

    // Pad Synth - Lush, detuned pad sound
    SynthDef(\pad, { |out=0, freq=440, amp=0.3, gate=1, attack=0.5, decay=0.3, sustain=0.8, release=1.5, detune=0.08, cutoff=3000|
        var env = EnvGen.kr(Env.adsr(attack, decay, sustain, release), gate, doneAction: 2);
        var sig = Mix([
            Saw.ar(freq * (1 - detune)),
            Saw.ar(freq),
            Saw.ar(freq * (1 + detune)),
            Saw.ar(freq * (1 - (detune * 0.5))),
            Saw.ar(freq * (1 + (detune * 0.5))),
            Saw.ar(freq * 2) * 0.3
        ]) * 0.2;
        sig = LPF.ar(sig, cutoff);
        sig = sig * env * amp;
        Out.ar(out, [sig, sig]);
    }).add;

    // Bass Synth - Deep, punchy bass sound
    SynthDef(\bass, { |out=0, freq=220, amp=0.6, gate=1, attack=0.01, decay=0.2, sustain=0.5, release=0.3, cutoff=800, resonance=0.3, drive=1.0|
        var env = EnvGen.kr(Env.adsr(attack, decay, sustain, release), gate, doneAction: 2);
        var sub = SinOsc.ar(freq * 0.5) * 0.6;
        var main = Saw.ar(freq) * 0.4;
        var sig = (sub + main) * drive;
        sig = RLPF.ar(sig, cutoff, resonance.linlin(0, 1, 1, 0.1));
        sig = sig.tanh;
        sig = sig * env * amp;
        Out.ar(out, [sig, sig]);
    }).add;

    // Lead Synth - Bright, cutting lead sound
    SynthDef(\lead, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, decay=0.1, sustain=0.7, release=0.2, cutoff=4000, resonance=0.4, detune=0.02|
        var env = EnvGen.kr(Env.adsr(attack, decay, sustain, release), gate, doneAction: 2);
        var filterEnv = EnvGen.kr(Env.adsr(attack, decay * 0.5, sustain * 0.3, release));
        var sig = Mix([
            Saw.ar(freq * (1 - detune)),
            Saw.ar(freq * (1 + detune))
        ]) * 0.5;
        var cutoffMod = cutoff + (cutoff * 2 * filterEnv);
        sig = RLPF.ar(sig, cutoffMod.clip(20, 20000), resonance.linlin(0, 1, 1, 0.1));
        sig = sig * env * amp;
        Out.ar(out, [sig, sig]);
    }).add;

    // Pluck Synth - Karplus-Strong plucked string
    SynthDef(\pluck, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=2.0, coef=0.5|
        var env = EnvGen.kr(Env.perc(attack, release), gate, doneAction: 2);
        var sig = Pluck.ar(
            in: WhiteNoise.ar(0.1),
            trig: gate,
            maxdelaytime: 0.1,
            delaytime: freq.reciprocal,
            decaytime: release,
            coef: coef
        );
        sig = sig * env * amp;
        Out.ar(out, [sig, sig]);
    }).add;

    // Bell Synth - Metallic bell/mallet sound
    SynthDef(\bell, { |out=0, freq=440, amp=0.5, gate=1, attack=0.001, release=3.0, brightness=1.0|
        var env = EnvGen.kr(Env.perc(attack, release, curve: -4), gate, doneAction: 2);
        var sig = Mix([
            SinOsc.ar(freq) * 0.5,
            SinOsc.ar(freq * 2.76) * 0.3,
            SinOsc.ar(freq * 5.4) * 0.15,
            SinOsc.ar(freq * 8.93) * 0.05
        ]) * brightness;
        sig = sig * env * amp;
        Out.ar(out, [sig, sig]);
    }).add;

    // Organ Synth - Classic tonewheel organ sound
    SynthDef(\organ, { |out=0, freq=440, amp=0.5, gate=1, attack=0.01, release=0.1, drawbar1=0.8, drawbar2=0.6, drawbar3=0.4|
        var env = EnvGen.kr(Env.asr(attack, 1, release), gate, doneAction: 2);
        var sig = Mix([
            SinOsc.ar(freq * 0.5) * drawbar1,
            SinOsc.ar(freq) * drawbar2,
            SinOsc.ar(freq * 2) * drawbar3,
            SinOsc.ar(freq * 3) * (drawbar3 * 0.5)
        ]) * 0.3;
        sig = sig * env * amp;
        Out.ar(out, [sig, sig]);
    }).add;

    s.sync;

    "✅ SynthDefs loaded".postln;
    "   MONITORING: audioMonitor, audioInputMonitor".postln;
    "   BASIC: sine, saw, square, samplePlayer, metronome".postln;
    "   INSTRUMENTS: fm, pad, bass, lead, pluck, bell, organ".postln;
    "BUFFER_IDS: waveform=%, spectrum=%".format(~waveformBuffer.bufnum, ~spectrumBuffer.bufnum).postln;

    // Create NetAddr for Python backend
    ~pythonAddr = NetAddr("127.0.0.1", 57121);

    "   sclang listening on port 57120 (receives from scsynth via SendReply)".postln;
    "   Forwarding to Python on 127.0.0.1:57121".postln;

// Listen for buffer_ready messages from scsynth
// This is sent when a buffer partition is ready to be read
OSCdef(\bufferReadyRelay, { |msg|
    // msg format: ['/buffer_ready', nodeID, replyID, partition, bufferID, chunkSize, numChunks]
    var partition = msg[3].asInteger;
    var bufferID = msg[4].asInteger;
    var chunkSize = msg[5].asInteger;
    var numChunks = msg[6].asInteger;

    // Read from the PREVIOUS partition (the one that just finished writing)
    var readPartition = (partition - 1) % numChunks;
    var startIndex = readPartition * chunkSize;

    // Use the existing buffer (don't create a new one!)
    ~waveformBuffer.getn(startIndex, chunkSize, { |data|
        // Forward the audio data to Python
        // Format: ['/waveform', ...samples]
        ~pythonAddr.sendMsg('/waveform', *(data.as(Array)));

        // Debug: print first waveform send
        if(~firstWaveformSent.isNil, {
            "✅ First waveform data sent to Python (% samples)".format(data.size).postln;
            ~firstWaveformSent = true;
        });
    });

    // Debug: print first message
    if(~firstBufferMessage.isNil, {
        "✅ First buffer_ready message received from scsynth".postln;
        "   Partition: %, Buffer: %, ChunkSize: %, NumChunks: %".format(partition, bufferID, chunkSize, numChunks).postln;
        ~firstBufferMessage = true;
    });
}, '/buffer_ready');

// Listen for spectrum_ready messages (for FFT data)
OSCdef(\spectrumReadyRelay, { |msg|
    // msg format: ['/spectrum_ready', nodeID, replyID, partition, bufferID, chunkSize, numChunks]
    var partition = msg[3].asInteger;
    var bufferID = msg[4].asInteger;
    var chunkSize = msg[5].asInteger;
    var numChunks = msg[6].asInteger;

    var readPartition = (partition - 1) % numChunks;
    var startIndex = readPartition * chunkSize;

    // Use the existing buffer (don't create a new one!)
    ~spectrumBuffer.getn(startIndex, chunkSize, { |data|
        ~pythonAddr.sendMsg('/spectrum', *(data.as(Array)));
    });
    
    if(~firstSpectrumMessage.isNil, {
        "✅ First spectrum_ready message received from scsynth".postln;
        ~firstSpectrumMessage = true;
    });
}, '/spectrum_ready');

// Listen for meter data (simple peak/RMS values, can use SendReply directly)
OSCdef(\meterRelay, { |msg|
    // msg format: ['/meter', nodeID, replyID, peakL, peakR, rmsL, rmsR]
    ~pythonAddr.sendMsg(*msg);

    if(~firstMeterMessage.isNil, {
        "✅ First meter message received from scsynth".postln;
        ~firstMeterMessage = true;
    });
}, '/meter');

// Listen for INPUT audio waveform
OSCdef(\inputBufferReadyRelay, { |msg|
    var partition = msg[3].asInteger;
    var bufferID = msg[4].asInteger;
    var chunkSize = msg[5].asInteger;
    var numChunks = msg[6].asInteger;

    var readPartition = (partition - 1) % numChunks;
    var startIndex = readPartition * chunkSize;

    ~waveformBuffer.getn(startIndex, chunkSize, { |data|
        ~pythonAddr.sendMsg('/input_waveform', *(data.as(Array)));
    });

    if(~firstInputWaveformMessage.isNil, {
        "✅ First input waveform message received".postln;
        ~firstInputWaveformMessage = true;
    });
}, '/input_buffer_ready');

// Listen for INPUT audio spectrum
OSCdef(\inputSpectrumReadyRelay, { |msg|
    var partition = msg[3].asInteger;
    var bufferID = msg[4].asInteger;
    var chunkSize = msg[5].asInteger;
    var numChunks = msg[6].asInteger;

    var readPartition = (partition - 1) % numChunks;
    var startIndex = readPartition * chunkSize;

    ~spectrumBuffer.getn(startIndex, chunkSize, { |data|
        ~pythonAddr.sendMsg('/input_spectrum', *(data.as(Array)));
    });

    if(~firstInputSpectrumMessage.isNil, {
        "✅ First input spectrum message received".postln;
        ~firstInputSpectrumMessage = true;
    });
}, '/input_spectrum_ready');

// Listen for INPUT audio meters
OSCdef(\inputMeterRelay, { |msg|
    ~pythonAddr.sendMsg(*msg);

    if(~firstInputMeterMessage.isNil, {
        "✅ First input meter message received".postln;
        ~firstInputMeterMessage = true;
    });
}, '/input_meter');

    "✅ OSC Relay ready!".postln;
    "   Waiting for messages from scsynth...".postln;

    // Explicitly open the UDP port
    thisProcess.openUDPPort(57120);
}).play;
)

