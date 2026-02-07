#!/usr/bin/env python3
"""
Audio Analyzer for Sonic Pi OSC Feedback Loop
Captures system audio, analyzes it in real-time, and sends OSC messages to Sonic Pi.

SETUP:
1. Install BlackHole: brew install blackhole-2ch
2. Create Multi-Output Device in Audio MIDI Setup (Sonic Pi output + BlackHole)
3. Install dependencies: pip install python-osc sounddevice numpy
4. Enable OSC in Sonic Pi: Preferences → IO → Enable OSC Server
5. Run this script, then run osc_reactive.rb in Sonic Pi
"""

import numpy as np
import sounddevice as sd
from pythonosc import udp_client
import time
import sys

# Configuration
SONIC_PI_IP = "127.0.0.1"
SONIC_PI_PORT = 4560
SAMPLE_RATE = 44100
BLOCK_SIZE = 2048  # ~46ms at 44100Hz
DEVICE_NAME = "BlackHole"  # Change if using different virtual audio device

# Initialize OSC client
osc_client = udp_client.SimpleUDPClient(SONIC_PI_IP, SONIC_PI_PORT)

def find_blackhole_device():
    """Find BlackHole or similar virtual audio device."""
    devices = sd.query_devices()
    for i, dev in enumerate(devices):
        if DEVICE_NAME.lower() in dev['name'].lower() and dev['max_input_channels'] > 0:
            print(f"✓ Found audio device: {dev['name']} (index {i})")
            return i
    print(f"⚠ {DEVICE_NAME} not found. Available input devices:")
    for i, dev in enumerate(devices):
        if dev['max_input_channels'] > 0:
            print(f"  [{i}] {dev['name']}")
    return None

def analyze_audio(audio_data):
    """Analyze audio and return metrics."""
    # Flatten to mono if stereo
    if len(audio_data.shape) > 1:
        audio = np.mean(audio_data, axis=1)
    else:
        audio = audio_data
    
    # Amplitude (RMS)
    amplitude = np.sqrt(np.mean(audio ** 2))
    amplitude = min(amplitude * 5, 1.0)  # Scale and clamp
    
    # FFT for frequency analysis
    fft = np.abs(np.fft.rfft(audio))
    freqs = np.fft.rfftfreq(len(audio), 1/SAMPLE_RATE)
    
    # Dominant frequency
    if np.max(fft) > 0.001:
        dominant_idx = np.argmax(fft[1:]) + 1  # Skip DC
        dominant_freq = freqs[dominant_idx]
    else:
        dominant_freq = 500
    
    # Energy (weighted by frequency bands)
    low_energy = np.sum(fft[(freqs >= 20) & (freqs < 250)])
    mid_energy = np.sum(fft[(freqs >= 250) & (freqs < 2000)])
    high_energy = np.sum(fft[(freqs >= 2000) & (freqs < 8000)])
    total_energy = low_energy + mid_energy + high_energy
    
    if total_energy > 0:
        energy = min((low_energy + mid_energy * 0.5) / total_energy, 1.0)
        brightness = high_energy / total_energy
    else:
        energy = 0.5
        brightness = 0.5
    
    return {
        'amplitude': float(amplitude),
        'frequency': float(dominant_freq),
        'energy': float(energy),
        'brightness': float(brightness)
    }

def send_osc_data(metrics):
    """Send analyzed metrics to Sonic Pi via OSC."""
    osc_client.send_message("/amplitude", metrics['amplitude'])
    osc_client.send_message("/frequency", metrics['frequency'])
    osc_client.send_message("/energy", metrics['energy'])
    osc_client.send_message("/brightness", metrics['brightness'])

def audio_callback(indata, frames, time_info, status):
    """Called for each audio block."""
    if status:
        print(f"Audio status: {status}")
    
    metrics = analyze_audio(indata)
    send_osc_data(metrics)
    
    # Visual feedback
    bar_len = int(metrics['amplitude'] * 30)
    bar = '█' * bar_len + '░' * (30 - bar_len)
    print(f"\r[{bar}] amp:{metrics['amplitude']:.2f} freq:{metrics['frequency']:4.0f}Hz energy:{metrics['energy']:.2f} bright:{metrics['brightness']:.2f}", end='')

def main():
    print("═" * 60)
    print("  🎵 Sonic Pi Audio Analyzer - OSC Feedback System")
    print("═" * 60)
    
    device_id = find_blackhole_device()
    if device_id is None:
        print("\n⚠ No virtual audio device found!")
        print("Install BlackHole: brew install blackhole-2ch")
        print("Then create Multi-Output Device in Audio MIDI Setup")
        sys.exit(1)
    
    print(f"\n→ Sending OSC to {SONIC_PI_IP}:{SONIC_PI_PORT}")
    print("→ Press Ctrl+C to stop\n")
    
    try:
        with sd.InputStream(device=device_id, channels=2, samplerate=SAMPLE_RATE,
                           blocksize=BLOCK_SIZE, callback=audio_callback):
            print("🎧 Listening... (run osc_reactive.rb in Sonic Pi)\n")
            while True:
                time.sleep(0.1)
    except KeyboardInterrupt:
        print("\n\n✓ Stopped.")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure BlackHole is installed: brew install blackhole-2ch")
        print("2. Create Multi-Output Device in Audio MIDI Setup")
        print("3. Set Multi-Output as system output")
        sys.exit(1)

if __name__ == "__main__":
    main()

