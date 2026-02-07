# ═══════════════════════════════════════════════════════════════════════════
# "Golden Hour" - Uplifting Melodic House
# ═══════════════════════════════════════════════════════════════════════════
# Inspired by Two Lanes' warmer, more hopeful moments
# Bright melodies, gentle groove, sunset vibes

use_bpm 120

# Warm foundation pad
live_loop :sunset do
  with_fx :reverb, room: 0.9, mix: 0.65 do
    with_fx :lpf, cutoff: 88 do
      use_synth :prophet
      chords = (ring chord(:Ab3,:major7), chord(:Fm3,:minor7), chord(:Db3,:major7), chord(:Eb3,:major))
      play chords.tick, attack: 2, sustain: 5, release: 1, amp: 0.25
      sleep 8
    end
  end
end

# Gentle driving kick
live_loop :pulse do
  with_fx :lpf, cutoff: 105 do
    sample :bd_haus, amp: 0.55, rate: 0.95
    sleep 1
  end
end

# Warm sub bass
live_loop :bass do
  sync :pulse
  use_synth :sine
  notes = (ring :Ab1, :Ab1, :Fm1, :Fm1, :Db1, :Db1, :Eb1, :Eb1)
  play notes.tick, attack: 0.1, sustain: 0.7, release: 0.2, amp: 0.5
  sleep 1
end

# Uplifting piano melody
live_loop :piano_light do
  sync :sunset
  sleep 2
  with_fx :reverb, room: 0.75, mix: 0.5 do
    with_fx :echo, phase: 0.375, decay: 4, mix: 0.25 do
      use_synth :piano
      # Bright, hopeful melody
      melody = (ring
        [:Ab4,0.5], [:C5,0.5], [:Eb5,0.75], [:F5,0.25], [:Eb5,0.5], [:C5,0.5], [:Ab4,1],
        [:Bb4,0.5], [:Db5,0.5], [:F5,0.75], [:Eb5,0.25], [:Db5,0.5], [:Bb4,0.5], [:Ab4,1]
      )
      melody.each do |n, d|
        play n, amp: rrand(0.32, 0.45), attack: 0.01, release: d + rrand(0.5, 1)
        sleep d
      end
    end
  end
end

# Soft hi-hats
live_loop :hats do
  sync :pulse
  with_fx :hpf, cutoff: 108 do
    with_fx :reverb, room: 0.3, mix: 0.2 do
      sleep 0.5
      sample :drum_cymbal_closed, amp: rrand(0.12, 0.22), rate: rrand(1.95, 2.1)
      sleep 0.5
    end
  end
end

# Gentle clap on 2 and 4
live_loop :clap do
  sync :pulse
  sleep 1
  with_fx :reverb, room: 0.55, mix: 0.35 do
    sample :perc_snap, amp: 0.3, rate: 1.0
  end
  sleep 1
end

# Shimmering pluck arpeggios
live_loop :shimmer do
  sync :sunset
  with_fx :reverb, room: 0.8, mix: 0.55 do
    with_fx :echo, phase: 0.25, decay: 4, mix: 0.35 do
      use_synth :pluck
      notes = scale(:Ab4, :major_pentatonic, num_octaves: 2)
      16.times do
        play notes.choose, amp: rrand(0.12, 0.22), release: rrand(0.6, 1.2)
        sleep 0.5
      end
    end
  end
end

# Blade texture layer
live_loop :glow do
  sync :sunset
  sleep 4
  with_fx :reverb, room: 0.85, mix: 0.6 do
    use_synth :blade
    notes = (ring :Ab5, :C6, :Eb5, :F5)
    4.times do
      play notes.tick, amp: rrand(0.08, 0.14), attack: 0.02, release: 1.5, cutoff: rrand(85, 100)
      sleep 2
    end
  end
end

# Warm pad swell
live_loop :warmth do
  sync :sunset
  sleep 6
  with_fx :reverb, room: 0.9, mix: 0.6 do
    with_fx :lpf, cutoff: 70, cutoff_slide: 6 do |f|
      use_synth :hollow
      control f, cutoff: 95
      play_chord [:Ab3, :C4, :Eb4], attack: 4, sustain: 1, release: 1, amp: 0.15
      sleep 6
    end
  end
end

# Open hat accents
live_loop :ohats do
  sync :pulse
  pattern = (ring 0, 0, 0, 1, 0, 0, 1, 0)
  8.times do |i|
    sample :drum_cymbal_open, amp: 0.1, rate: 2.0, finish: 0.1 if pattern[i] == 1
    sleep 0.5
  end
end

# Subtle percussion
live_loop :perc do
  sync :pulse
  4.times do
    sample :perc_bell, amp: 0.06, rate: rrand(1.8, 2.5) if one_in(4)
    sample :elec_ping, amp: 0.05, rate: rrand(1.5, 2.0) if one_in(6)
    sleep 1
  end
end

# Choir texture - distant and warm
live_loop :voices do
  sync :sunset
  sleep 12
  with_fx :reverb, room: 1, mix: 0.8 do
    with_fx :lpf, cutoff: 80 do
      sample :ambi_choir, amp: 0.1, rate: 0.7
    end
  end
  sleep 4
end

