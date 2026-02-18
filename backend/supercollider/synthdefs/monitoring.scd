/*
 * Monitoring SynthDefs
 * 
 * SynthDefs for audio monitoring and metering:
 * - audioMonitor: Master output monitoring with waveform/spectrum/meters
 * - audioInputMonitor: Audio input monitoring (microphone/line-in)
 * - trackMixer: Per-track mixer channel with metering
 */

(
var chunkSize = 1024;
var numChunks = 8;

// Master Output Monitor - monitors master bus (0) for waveform/spectrum/meters
// Also applies master volume and outputs to hardware
SynthDef(\audioMonitor, { |targetBus=0, waveformBuf, spectrumBuf, sendRate=60, volume=1.0, mute=0|
    var sig, mono, phase, trig, partition, meterTrig, left, right, peakL, peakR, rmsL, rmsR, finalSig;

    sig = In.ar(targetBus, 2);
    mono = Mix.ar(sig) * 0.5;

    // Waveform capture (Python will do FFT on this data)
    phase = Phasor.ar(0, 1, 0, chunkSize);
    trig = HPZ1.ar(phase) < 0;
    partition = PulseCount.ar(trig) % numChunks;

    BufWr.ar(mono, waveformBuf, phase + (chunkSize * partition));
    SendReply.ar(trig, '/buffer_ready', [partition, waveformBuf, chunkSize, numChunks]);

    // Meters (BEFORE volume/mute for accurate metering)
    meterTrig = Impulse.kr(sendRate);
    left = sig[0];
    right = sig[1];
    // Peak.ar resets on trigger - no lag needed as it holds the peak value
    peakL = Peak.ar(left, meterTrig);
    peakR = Peak.ar(right, meterTrig);
    rmsL = RunningSum.ar(left.squared, 48000 / sendRate).sqrt;
    rmsR = RunningSum.ar(right.squared, 48000 / sendRate).sqrt;

    SendReply.kr(meterTrig, '/meter', [peakL, peakR, rmsL, rmsR]);

    // Apply master volume and mute, then output to hardware (ReplaceOut replaces the bus)
    finalSig = sig * volume * (1 - mute);
    ReplaceOut.ar(targetBus, finalSig);
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

// Track Mixer - Per-track mixer channel with metering
// Reads from track bus, applies volume/pan/mute/solo, outputs to master, sends meters
SynthDef(\trackMixer, { |inBus=10, outBus=0, volume=1.0, pan=0.0, mute=0, solo=0, trackId=0, sendRate=30|
    var sig, left, right, peakL, peakR, rmsL, rmsR, meterTrig, finalSig;
    
    // Read stereo input from track bus
    sig = In.ar(inBus, 2);
    
    // Apply mute (mute=1 means silent)
    sig = sig * (1 - mute);
    
    // Apply volume
    sig = sig * volume;
    
    // Apply pan (Balance2 for stereo input)
    sig = Balance2.ar(sig[0], sig[1], pan);
    
    // Metering (before final output)
    meterTrig = Impulse.kr(sendRate);
    left = sig[0];
    right = sig[1];
    peakL = Peak.ar(left, meterTrig).lag(0.1);
    peakR = Peak.ar(right, meterTrig).lag(0.1);
    rmsL = RunningSum.ar(left.squared, 48000 / sendRate).sqrt;
    rmsR = RunningSum.ar(right.squared, 48000 / sendRate).sqrt;
    
    // Send per-track meter data with track ID
    // Format: [trackId, peakL, peakR, rmsL, rmsR]
    SendReply.kr(meterTrig, '/track_meter', [trackId, peakL, peakR, rmsL, rmsR]);
    
    // Output to master bus
    Out.ar(outBus, sig);
}).add;

"✅ Monitoring SynthDefs loaded".postln;
"   audioMonitor: Master output monitoring".postln;
"   audioInputMonitor: Audio input monitoring".postln;
"   trackMixer: Per-track mixer with metering".postln;
)

