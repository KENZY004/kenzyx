"use client";

// Context wrapper to ensure it's only created on client side and on demand,
// as browsers require user interaction before creating AudioContext.
let audioCtx: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export const sounds = {
  // A tiny, crisp UI click (like a haptic tap)
  click: () => {
    try {
      const ctx = getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.03);
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch { /* ignore audio errors */ }
  },
  
  // A fast, low swipe/swoosh sound for entering battles or big view changes
  swoosh: () => {
    try {
      const ctx = getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
      
      // Fast attack, slow release (0.2s total)
      gain.gain.setValueAtTime(0.0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch { /* ignore audio errors */ }
  },
  
  // A pleasant 2-note ascending chime for accepted submissions / battle win
  success: () => {
    try {
      const ctx = getContext();
      if (!ctx) return;
      
      const playNote = (freq: number, startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.type = "sine";
          osc.frequency.value = freq;
          
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          
          osc.start(startTime);
          osc.stop(startTime + duration);
      };
      
      const now = ctx.currentTime;
      playNote(523.25, now, 0.1);       // C5
      playNote(783.99, now + 0.1, 0.3); // G5
    } catch { /* ignore audio errors */ }
  },
  
  // A low dull thud for failed test cases or battle loss
  error: () => {
    try {
      const ctx = getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch { /* ignore audio errors */ }
  },

  // Plays a real MP3/WAV file for complex sounds like sword clashes
  battleClash: () => {
    try {
      const audio = new Audio("/sounds/sword-clash.mp3");
      audio.volume = 0.5; // adjust volume as needed
      audio.play().catch(() => { /* Chrome block mitigation */ });
    } catch { /* ignore error */ }
  }
};
