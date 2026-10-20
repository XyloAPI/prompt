export const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "oga", "m4a", "aac", "flac", "opus", "weba"] as const;

const AUDIO_EXT_RE = new RegExp(`\\.(${AUDIO_EXTENSIONS.join("|")})(\\?.*)?$`, "i");

export const AUDIO_ACCEPT = `audio/*,${AUDIO_EXTENSIONS.map((ext) => `.${ext}`).join(",")}`;

export function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/") || AUDIO_EXT_RE.test(file.name);
}

export function isAudioAsset(
  category?: string | null,
  ...urls: (string | null | undefined)[]
): boolean {
  if (category === "sfx") return true;
  return urls.some((url) => (url ? AUDIO_EXT_RE.test(url) : false));
}

export function audioFormat(url: string): string {
  const match = url.split("?")[0].match(AUDIO_EXT_RE);
  return match ? match[1].toUpperCase() : "AUDIO";
}

export function buildWaveform(seed: string, count = 44): number[] {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    const value = Math.abs(hash % 1000) / 1000;
    bars.push(16 + Math.round(value * 84));
  }
  return bars;
}
