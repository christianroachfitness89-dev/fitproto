/**
 * Plays a short ascending chime (C-E-G) using the Web Audio API.
 * No audio files required. Safe to call anywhere — fails silently
 * if AudioContext is blocked or unavailable.
 */
export function playRestEndChime() {
  try {
    const ctx = new AudioContext()

    function note(freq: number, start: number, duration: number) {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(0.28, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
      osc.start(start)
      osc.stop(start + duration)
    }

    const t = ctx.currentTime
    note(523.25, t,        0.45)   // C5
    note(659.25, t + 0.14, 0.45)   // E5
    note(783.99, t + 0.28, 0.65)   // G5
  } catch {
    // AudioContext unavailable or blocked — silent fail
  }
}
