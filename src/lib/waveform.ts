import { buildWaveform } from "@/lib/media";

export const WAVEFORM_LEVELS = 8;
export const WAVEFORM_BUCKETS = 240;

const cache = new Map<string, number[]>();

/**
 * Quantize normalized amplitudes into discrete levels so the waveform
 * silhouette reads as a staircase instead of noise.
 *
 * Normalization uses a high percentile instead of the raw maximum: a single
 * loud transient would otherwise flatten every quiet passage to nothing.
 */
export function quantizeSteps(values: number[], levels = WAVEFORM_LEVELS): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const max = sorted[sorted.length - 1] ?? 0;
  if (max <= 0) return values.map(() => 0);
  const percentile = sorted[Math.floor((sorted.length - 1) * 0.95)] ?? max;
  const reference = Math.max(percentile, max * 0.2);
  return values.map((value) => {
    const normalized = Math.min(1, value / reference);
    const step = Math.max(value > 0 ? 1 : 0, Math.round(normalized * levels));
    return (step / levels) * 100;
  });
}

function smooth(values: number[]): number[] {
  if (values.length < 3) return values;
  return values.map((value, index) => {
    const previous = values[index - 1] ?? value;
    const next = values[index + 1] ?? value;
    return (previous + value * 2 + next) / 4;
  });
}

/** Resample an envelope to an exact number of bars, keeping peaks visible. */
export function resample(values: number[], count: number): number[] {
  if (count <= 0 || values.length === 0) return [];
  if (values.length === count) return values;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const start = Math.floor((i * values.length) / count);
    const end = Math.max(start + 1, Math.floor(((i + 1) * values.length) / count));
    let peak = 0;
    for (let j = start; j < end; j++) peak = Math.max(peak, values[j]);
    out.push(peak);
  }
  return out;
}

/** Deterministic staircase used when the real file cannot be decoded. */
export function seededWaveform(seed: string, count = 64): number[] {
  return quantizeSteps(buildWaveform(seed, count).map((value) => value / 100));
}

/**
 * Decode the actual audio file and return a stepped envelope (0-100 per bar).
 * Results are cached per URL so a page visit never decodes the same file twice.
 */
export async function decodeWaveform(src: string): Promise<number[] | null> {
  const cached = cache.get(src);
  if (cached) return cached;

  try {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = await res.arrayBuffer();
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;

    const context = new Ctx();
    try {
      const audio = await context.decodeAudioData(buffer);
      const data = audio.getChannelData(0);
      const step = Math.max(1, Math.floor(data.length / WAVEFORM_BUCKETS));
      const stride = Math.max(1, Math.floor(step / 64));
      const peaks: number[] = [];
      for (let i = 0; i < WAVEFORM_BUCKETS; i++) {
        const start = i * step;
        let peak = 0;
        let sum = 0;
        let count = 0;
        for (let j = 0; j < step; j += stride) {
          const value = Math.abs(data[start + j] ?? 0);
          if (value > peak) peak = value;
          sum += value * value;
          count += 1;
        }
        const rms = count > 0 ? Math.sqrt(sum / count) : 0;
        // Mix peak and RMS, then lift quiet passages so the shape stays readable.
        const mixed = 0.55 * peak + 0.45 * rms;
        peaks.push(Math.pow(mixed, 0.65));
      }
      const shaped = quantizeSteps(smooth(peaks));
      cache.set(src, shaped);
      return shaped;
    } finally {
      await context.close().catch(() => {});
    }
  } catch {
    return null;
  }
}
