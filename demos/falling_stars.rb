# ═══════════════════════════════════════════════════════════════════════════
# "Falling Stars" - Ethereal Melodic Journey
# ═══════════════════════════════════════════════════════════════════════════
# Inspired by Two Lanes' emotional, cinematic sound
# Delicate piano, vast spaces, gentle pulse, pure emotion

use_bpm 116

# Vast ethereal pad - the infinite sky
live_loop :sky do
  with_fx :reverb, room: 1, mix: 0.8, damp: 0.6 do
    with_fx :lpf, cutoff: 80, cutoff_slide: 8 do |f|
      control f, cutoff: rrand(70, 90)
      use_synth :hollow
      play_chord [:B2, :Fs3, :B3, :Ds4], attack: 6, sustain: 8, release: 6, amp: 0.3
      sleep 20
    end
  end
end

# Emotional piano - the heart of the track
live_loop :piano_soul do
  sync :sky
  sleep 4
  with_fx :reverb, room: 0.85, mix: 0.55 do
    with_fx :echo, phase: 0.5, decay: 6, mix: 0.3 do
      use_synth :piano
      # Delicate, expressive phrases
      phrases = [
        [:B4, :Ds5, :Fs5, :B5],
        [:Gs4, :B4, :Ds5, :Gs5],
        [:E4, :Gs4, :B4, :E5],
        [:Fs4, :As4, :Cs5, :Fs5]
      ]
      phrase = phrases.tick
      phrase.each do |n|
        play n, amp: rrand(0.28, 0.42), attack: 0.01, release: rrand(2.5, 4)
        sleep rrand(0.6, 1.2)
      end
      sleep rrand(3, 6)
    end
  end
end

# Gentle heartbeat pulse
live_loop :heartbeat do
  sync :sky
  sleep 8
  with_fx :reverb, room: 0.5, mix: 0.35 do
    with_fx :lpf, cutoff: 95 do
      sample :bd_haus, amp: 0.45, rate: 0.9
      sleep 2
    end
  end
end

# Warm sub presence
live_loop :warmth do
  sync :sky
  use_synth :sine
  bass = (ring :B1, :B1, :Gs1, :Fs1)
  play bass.tick, attack: 0.8, sustain: 3.5, release: 0.7, amp: 0.45
  sleep 5
end

# Crystalline arpeggios - like stars twinkling
live_loop :stars do
  sync :sky
  sleep 6
  with_fx :reverb, room: 0.9, mix: 0.65 do
    with_fx :echo, phase: 0.375, decay: 5, mix: 0.4 do
      use_synth :blade
      notes = scale(:B4, :major_pentatonic, num_octaves: 2)
      12.times do
        play notes.choose, amp: rrand(0.06, 0.14), attack: 0.01,
             release: rrand(0.8, 2), cutoff: rrand(80, 105)
        sleep rrand(0.4, 1.2)
      end
    end
  end
end

# Prophet swell - emotional crescendo
live_loop :emotion do
  sync :sky
  sleep 10
  with_fx :reverb, room: 0.95, mix: 0.7 do
    with_fx :lpf, cutoff: 55, cutoff_slide: 8 do |f|
      use_synth :prophet
      control f, cutoff: 100
      play_chord [:B3, :Ds4, :Fs4, :B4], attack: 6, sustain: 2, release: 2, amp: 0.18
      sleep 10
    end
  end
end

# Soft texture - distant whispers
live_loop :whispers do
  sync :sky
  with_fx :reverb, room: 1, mix: 0.85 do
    with_fx :lpf, cutoff: 75 do
      sample :ambi_choir, amp: 0.08, rate: 0.6 if one_in(3)
      sample :ambi_glass_rub, amp: 0.04, rate: rrand(0.7, 1.1) if one_in(4)
    end
  end
  sleep 8
end

# Gentle hi-hat shimmer
live_loop :shimmer_hat do
  sync :heartbeat
  with_fx :reverb, room: 0.6, mix: 0.5 do
    with_fx :hpf, cutoff: 110 do
      sleep 1
      sample :drum_cymbal_closed, amp: rrand(0.08, 0.15), rate: rrand(2.0, 2.3)
      sleep 1
    end
  end
end

# Ambient texture layer
live_loop :texture do
  sync :sky
  with_fx :reverb, room: 1, mix: 0.8 do
    use_synth :dark_ambience
    play :B2, attack: 10, sustain: 6, release: 4, amp: 0.08, cutoff: rrand(55, 70)
    sleep 20
  end
end

# Delicate bell accents
live_loop :bells do
  sync :sky
  sleep rrand(2, 6)
  with_fx :reverb, room: 0.8, mix: 0.6 do
    if one_in(2)
      use_synth :pretty_bell
      play (scale :B5, :major_pentatonic).choose, amp: rrand(0.06, 0.12), release: 3
    end
  end
  sleep rrand(4, 8)
end

