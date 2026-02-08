# ═══════════════════════════════════════════════════════════════════════════════
# "Living Frequencies" - OSC-Reactive Sonic Pi Composition
# This composition LISTENS to audio analysis from Python and adapts in real-time!
# BPM: 120 | Key: A minor | Responds to: amplitude, frequency, beat detection
# ═══════════════════════════════════════════════════════════════════════════════
# SETUP: Enable OSC in Sonic Pi: Preferences → IO → Enable OSC Server
# Default OSC port: 4560
# ═══════════════════════════════════════════════════════════════════════════════

use_bpm 120

# Initialize reactive parameters (will be updated by OSC)
set :osc_amp, 0.5        # 0.0 - 1.0 from audio amplitude
set :osc_freq, 500       # Dominant frequency from FFT
set :osc_beat, 0         # Beat detection trigger
set :osc_energy, 0.5     # Overall energy level
set :osc_brightness, 70  # Spectral brightness → filter cutoff

# Chord progression: Am → F → C → G
chords = [(chord :a3, :minor7), (chord :f3, :major7),
          (chord :c4, :major7), (chord :g3, :major)]
bass_notes = (ring :a1, :f1, :c2, :g1)

# ═══ OSC LISTENERS - Receive data from Python audio analyzer ═══
live_loop :osc_amplitude do
  data = sync "/osc*/amplitude"
  set :osc_amp, data[0].to_f.clamp(0, 1)
end

live_loop :osc_frequency do
  data = sync "/osc*/frequency"
  set :osc_freq, data[0].to_f.clamp(20, 2000)
end

live_loop :osc_energy do
  data = sync "/osc*/energy"
  set :osc_energy, data[0].to_f.clamp(0, 1)
end

live_loop :osc_brightness do
  data = sync "/osc*/brightness"
  set :osc_brightness, (data[0].to_f * 100).clamp(50, 130)
end

# ═══ REACTIVE PAD - Filter responds to brightness ═══
live_loop :reactive_pad do
  cutoff = get(:osc_brightness)
  amp = 0.3 + (get(:osc_energy) * 0.2)
  with_fx :reverb, room: 0.9, mix: 0.7 do
    with_fx :lpf, cutoff: cutoff do
      chords.each do |c|
        synth :hollow, notes: c, sustain: 3.5, release: 2,
              amp: amp, cutoff: cutoff, attack: 0.5
        sleep 4
      end
    end
  end
end

# ═══ WARM PROPHET PAD - Amp responds to energy ═══
live_loop :prophet_reactive do
  sync :reactive_pad
  energy = get(:osc_energy)
  with_fx :reverb, room: 0.85, mix: 0.6 do
    chords.each do |c|
      synth :prophet, notes: c, sustain: 3, release: 1.5,
            amp: 0.1 + (energy * 0.15), cutoff: 70 + (energy * 30)
      sleep 4
    end
  end
end

# ═══ KICK - Steady foundation ═══
live_loop :kick, sync: :reactive_pad do
  sample :bd_haus, amp: 0.8 + (get(:osc_amp) * 0.2)
  sleep 1
end

# ═══ SUB BASS - Follows chords ═══
live_loop :sub_bass do
  sync :reactive_pad
  bass_notes.each do |n|
    with_fx :lpf, cutoff: 70 + (get(:osc_energy) * 30) do
      synth :sine, note: n, sustain: 3.5, release: 0.5, amp: 0.5
    end
    sleep 4
  end
end

# ═══ ARPEGGIOS - Speed and density respond to energy ═══
live_loop :reactive_arps do
  sync :reactive_pad
  energy = get(:osc_energy)
  rate = [0.5, 0.25, 0.125][[(energy * 3).to_i, 2].min]
  with_fx :reverb, room: 0.8, mix: 0.5 do
    with_fx :echo, phase: 0.375, decay: 4, mix: 0.4 do
      (4 / rate).to_i.times do
        synth :blade, note: (scale :a4, :minor_pentatonic).choose,
              release: rate * 1.5, amp: 0.08 + (energy * 0.06),
              cutoff: get(:osc_brightness)
        sleep rate
      end
    end
  end
end

# ═══ MELODIC LEAD - Note selection influenced by detected frequency ═══
live_loop :freq_lead do
  sync :reactive_pad
  freq = get(:osc_freq)
  # Map frequency to note selection bias
  if get(:osc_energy) > 0.4
    melody_scale = (scale :a4, :minor_pentatonic)
    note_idx = ((freq - 200) / 300.0 * melody_scale.length).to_i % melody_scale.length
    with_fx :reverb, room: 0.6, mix: 0.4 do
      with_fx :echo, phase: 0.5, decay: 2, mix: 0.3 do
        4.times do
          synth :saw, note: melody_scale[note_idx], release: 0.4,
                amp: 0.12 + (get(:osc_amp) * 0.08), cutoff: 85
          note_idx = (note_idx + [1, 2, -1].choose) % melody_scale.length
          sleep 1
        end
      end
    end
  else
    sleep 4
  end
end

# ═══ PERCUSSION - Responds to amplitude ═══
live_loop :hats, sync: :kick do
  amp = get(:osc_amp)
  sample :drum_cymbal_closed, amp: 0.05 + (amp * 0.1), rate: 1.2
  sleep 0.5
end

live_loop :snare, sync: :kick do
  sleep 1
  sample :sn_dub, amp: 0.3 + (get(:osc_amp) * 0.2), rate: 1.1
  sleep 1
end

# ═══ AMBIENT TEXTURE - Energy-reactive swells ═══
live_loop :ambient_swell do
  sync :reactive_pad
  if get(:osc_energy) > 0.6
    with_fx :reverb, room: 1, mix: 0.85 do
      synth :dark_ambience, note: :a2, sustain: 14, release: 2,
            amp: 0.15 + (get(:osc_energy) * 0.1), attack: 2
    end
  end
  sleep 16
end

# ═══ DEBUG: Print current OSC values ═══
live_loop :debug_print do
  puts "AMP: #{get(:osc_amp).round(2)} | ENERGY: #{get(:osc_energy).round(2)} | BRIGHT: #{get(:osc_brightness).round(0)} | FREQ: #{get(:osc_freq).round(0)}"
  sleep 4
end

