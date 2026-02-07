# "Celestial Pulse" - Evolving Ambient EDM (Compact Version)
# Paste into Sonic Pi and press Run

use_bpm 128
set :intensity, 0

# Evolution controller
live_loop :evolve do
  set :intensity, [get[:intensity] + 1, 10].min
  sleep 16
end

# Ambient pad foundation
live_loop :cosmos do
  with_fx :reverb, room: 0.9, mix: 0.7 do
    with_fx :lpf, cutoff: 70 + (get[:intensity] * 3) do
      use_synth :hollow
      play chord(:Fs3, :minor7), attack: 4, sustain: 8, release: 4, amp: 0.35
      sleep 16
    end
  end
end

# Driving kick
live_loop :kick do
  sample :bd_tek, amp: 0.5 + (get[:intensity] * 0.04), rate: 1.02
  sleep 1
end

# Sub bass
live_loop :sub do
  use_synth :sine
  play :Fs1, attack: 0.05, sustain: 0.3, release: 0.15, amp: 0.5
  sleep 1
end

# Catchy bassline
live_loop :bass do
  sync :kick
  use_synth :tb303
  pattern = (ring 1, 0, 0.5, 0, 1, 0, 0.5, 0.5)
  notes = (ring :Fs1, :Fs1, :A1, :A1, :E1, :E1, :B1, :Fs1)
  8.times do |i|
    play notes[i], amp: 0.5 * pattern[i], release: 0.2, cutoff: 75 if pattern[i] > 0
    sleep 0.5
  end
end

# Hi-hats
live_loop :hats do
  with_fx :hpf, cutoff: 115 do
    16.times do
      sample :drum_cymbal_closed, amp: (tick % 2 == 1) ? 0.3 : 0.12, rate: 2.1
      sleep 0.25
    end
  end
end

# Snare backbeat
live_loop :snare do
  sleep 1
  sample :sn_dolf, amp: 0.45, rate: 1.05
  sleep 1
end

# Catchy lead hook (enters at intensity 3)
live_loop :lead do
  sync :kick
  if get[:intensity] >= 3
    with_fx :reverb, room: 0.6, mix: 0.4 do
      with_fx :echo, phase: 0.375, decay: 3, mix: 0.3 do
        use_synth :saw
        hook = (ring [:Fs4,0.5],[:A4,0.25],[:B4,0.25],[:Cs5,0.5],[:B4,0.5],[:A4,0.5],[:Fs4,0.25],[:E4,0.25],[:Fs4,1])
        hook.each do |n, d|
          play n, amp: 0.28, attack: 0.02, release: d * 0.8, cutoff: rrand(90, 110), detune: 0.12
          sleep d
        end
      end
    end
  else
    sleep 4
  end
end

# Prophet chords (enters at intensity 2)
live_loop :chords do
  sync :kick
  if get[:intensity] >= 2
    with_fx :reverb, room: 0.75, mix: 0.5 do
      use_synth :prophet
      prog = (ring chord(:Fs3,:minor), chord(:D3,:major), chord(:A3,:major), chord(:E3,:major))
      play prog.tick, attack: 0.5, sustain: 3, release: 0.5, amp: 0.2, cutoff: 90
      sleep 4
    end
  else
    sleep 4
  end
end

# Shimmering arps
live_loop :arps do
  sync :kick
  with_fx :reverb, room: 0.8, mix: 0.5 do
    with_fx :echo, phase: 0.1875, decay: 4, mix: 0.35 do
      use_synth :blade
      arp = scale(:Fs4, :minor_pentatonic, num_octaves: 2).shuffle
      16.times do
        play arp.tick, amp: rrand(0.08, 0.15), attack: 0.01, release: 0.4, cutoff: rrand(85, 110)
        sleep 0.25
      end
    end
  end
end

# Percussion texture
live_loop :perc do
  sync :kick
  8.times do
    sample :perc_snap, amp: 0.2, rate: rrand(0.95, 1.1) if one_in(3)
    sample :elec_ping, amp: 0.1, rate: rrand(1.5, 2.2) if one_in(5)
    sleep 0.5
  end
end

# Open hats for groove
live_loop :ohats do
  sync :kick
  pattern = (ring 0, 0, 0, 1, 0, 0, 1, 0)
  8.times do |i|
    sample :drum_cymbal_open, amp: 0.15, rate: 2.1, finish: 0.12 if pattern[i] == 1
    sleep 0.5
  end
end

# Filter sweep builds (enters at intensity 5)
live_loop :sweep do
  sync :kick
  sleep 28
  if get[:intensity] >= 5
    with_fx :lpf, cutoff: 40, cutoff_slide: 4 do |f|
      use_synth :dsaw
      control f, cutoff: 130
      play :Fs2, attack: 0.3, sustain: 3.2, release: 0.5, amp: 0.3, detune: 0.15
      sleep 4
    end
  else
    sleep 4
  end
end

# Ambient swell
live_loop :swell do
  sync :kick
  sleep 12
  with_fx :reverb, room: 1, mix: 0.75 do
    use_synth :dark_ambience
    play :Fs3, attack: 4, sustain: 2, release: 2, amp: 0.1
    sleep 8
  end
end

