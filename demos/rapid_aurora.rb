# ═══════════════════════════════════════════════════════════════════════════
# "Rapid Aurora" - Fast-Evolving Comprehensive Pad Composition
# A Two Lanes inspired piece with rapid evolution and layered pads
# BPM: 122 | Key: C minor | ~130 lines
# ═══════════════════════════════════════════════════════════════════════════

use_bpm 122
set :intensity, 0
set :pad_cutoff, 70

# Chord progression: Cm → Ab → Eb → Bb (emotional minor progression)
chords = [(chord :c4, :minor7), (chord :ab3, :major7),
          (chord :eb4, :major7), (chord :bb3, :major)]
bass_notes = (ring :c2, :ab1, :eb2, :bb1)

# ═══ RAPID EVOLUTION CONTROLLER ═══
# Changes intensity every 4 beats for fast evolution!
live_loop :rapid_evolution do
  set :intensity, (get(:intensity) + 1) % 8  # Cycles 0-7 rapidly
  set :pad_cutoff, 60 + (get(:intensity) * 12)  # Filter opens with intensity
  sleep 4
end

# ═══ PAD LAYER 1: Deep Hollow Foundation ═══
live_loop :hollow_pad do
  with_fx :reverb, room: 0.9, mix: 0.7 do
    with_fx :lpf, cutoff: get(:pad_cutoff) do
      chords.each do |c|
        synth :hollow, notes: c, sustain: 3.5, release: 2, amp: 0.4,
              cutoff: get(:pad_cutoff), attack: 0.5
        sleep 4
      end
    end
  end
end

# ═══ PAD LAYER 2: Prophet Warmth ═══
live_loop :prophet_pad do
  sync :hollow_pad
  intensity = get(:intensity)
  with_fx :reverb, room: 0.85, mix: 0.6 do
    with_fx :lpf, cutoff: 70 + (intensity * 8) do
      chords.each do |c|
        synth :prophet, notes: c, sustain: 3, release: 1.5,
              amp: 0.15 + (intensity * 0.03), cutoff: 80 + (intensity * 5)
        sleep 4
      end
    end
  end
end

# ═══ PAD LAYER 3: Dark Ambience Swells ═══
live_loop :dark_pad do
  sync :hollow_pad
  if get(:intensity) >= 2
    with_fx :reverb, room: 1, mix: 0.8 do
      synth :dark_ambience, note: :c3, sustain: 14, release: 2,
            amp: 0.2 + rrand(0, 0.1), attack: 2
    end
  end
  sleep 16
end

# ═══ KICK - Enters at intensity 1+ ═══
live_loop :kick, sync: :hollow_pad do
  if get(:intensity) >= 1
    sample :bd_haus, amp: 0.9, cutoff: 100
  end
  sleep 1
end

# ═══ SUB BASS - Follows chord progression ═══
live_loop :sub_bass do
  sync :hollow_pad
  if get(:intensity) >= 1
    bass_notes.each do |n|
      with_fx :lpf, cutoff: 80 do
        synth :sine, note: n, sustain: 3.5, release: 0.5, amp: 0.5
      end
      sleep 4
    end
  else
    sleep 16
  end
end

# ═══ ARPEGGIOS - Shimmer layer ═══
live_loop :arps do
  sync :hollow_pad
  if get(:intensity) >= 3
    with_fx :reverb, room: 0.8, mix: 0.6 do
      with_fx :echo, phase: 0.375, decay: 4, mix: 0.4 do
        16.times do
          synth :blade, note: (scale :c5, :minor_pentatonic).choose,
                release: 0.3, amp: 0.1 + rrand(0, 0.05), cutoff: 90
          sleep 0.25
        end
      end
    end
  else
    sleep 4
  end
end

# ═══ MELODIC LEAD - Enters at high intensity ═══
live_loop :lead do
  sync :hollow_pad
  if get(:intensity) >= 5
    melody = (ring :c5, :eb5, :g5, :bb5, :c6, :bb5, :g5, :eb5)
    with_fx :reverb, room: 0.7, mix: 0.5 do
      with_fx :echo, phase: 0.5, decay: 3, mix: 0.3 do
        8.times do |i|
          synth :saw, note: melody[i], release: 0.4, amp: 0.15,
                cutoff: 85 + (get(:intensity) * 3)
          sleep 0.5
        end
      end
    end
  else
    sleep 4
  end
end

# ═══ HATS & PERCUSSION ═══
live_loop :hats, sync: :kick do
  if get(:intensity) >= 2
    sample :drum_cymbal_closed, amp: rrand(0.08, 0.15), rate: 1.2
  end
  sleep 0.5
end

live_loop :snare, sync: :kick do
  sleep 1
  if get(:intensity) >= 2
    sample :sn_dub, amp: 0.4, rate: 1.1
  end
  sleep 1
end

# ═══ TEXTURE - Choir swells on transitions ═══
live_loop :choir do
  sync :hollow_pad
  if get(:intensity) >= 4 and one_in(2)
    with_fx :reverb, room: 1, mix: 0.85 do
      sample :ambi_choir, rate: 0.5, amp: 0.2, attack: 2
    end
  end
  sleep 8
end

# ═══ FILTER SWEEP BUILDS ═══
live_loop :sweep do
  sync :hollow_pad
  if get(:intensity) == 7
    with_fx :lpf, cutoff: 60, cutoff_slide: 3.5 do |fx|
      synth :dsaw, note: :c3, sustain: 3.5, release: 0.5, amp: 0.2
      control fx, cutoff: 120
    end
  end
  sleep 4
end

