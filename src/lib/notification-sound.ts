const SOUND_PATHS = ["/sounds/notification.mp3", "/sounds/notification.wav"];
const FALLBACK_VOLUME = 0.3;

let audioContext: AudioContext | null = null;
let initialized = false;
let audioElement: HTMLAudioElement | null = null;

function initAudioContext() {
  if (initialized) return;
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    initialized = true;
  } catch {
    // Ignore — synthetic fallback will also try
  }
}

if (typeof window !== "undefined") {
  const events = ["click", "touchstart", "keydown", "scroll"];
  const handler = () => initAudioContext();
  events.forEach((event) => {
    window.addEventListener(event, handler, { once: true, passive: true });
  });
}

export async function playMp3Sound(): Promise<boolean> {
  for (const url of SOUND_PATHS) {
    const played = await playAudioFile(url);
    if (played) return true;
  }
  return false;
}

function playAudioFile(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(url);
      audio.volume = FALLBACK_VOLUME;
      audio.preload = "auto";

      audio.onloadeddata = () => {
        audio
          .play()
          .then(() => {
            audioElement = audio;
            resolve(true);
          })
          .catch(() => {
            resolve(false);
          });
      };

      audio.onerror = () => {
        resolve(false);
      };

      audio.load();

      const timeout = setTimeout(() => {
        resolve(false);
      }, 2000);

      audio.onended = () => {
        clearTimeout(timeout);
      };
      audio.onplay = () => {
        clearTimeout(timeout);
      };
    } catch {
      resolve(false);
    }
  });
}

export function playSyntheticSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const ctx = audioContext;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.frequency.value = 880;
    oscillator.type = "sine";

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.error("[notification-sound] Error playing synthetic sound:", e);
  }
}

export async function playNotificationSound(): Promise<void> {
  const played = await playMp3Sound();
  if (!played) {
    playSyntheticSound();
  }
}

export function supportsAudio(): boolean {
  return !!(typeof window !== "undefined" && (window.AudioContext || (window as any).webkitAudioContext));
}

export async function testSound(): Promise<void> {
  await playNotificationSound();
}
