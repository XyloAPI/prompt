"use client";

import * as React from "react";
import { Pause, Play } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { decodeWaveform, resample, seededWaveform } from "@/lib/waveform";

const MIN_BARS = 24;
const MAX_BARS = 180;
const BAR_SLOT = 5;

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const waveRef = React.useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(0);
  const [current, setCurrent] = React.useState(0);
  const [decoding, setDecoding] = React.useState(true);
  const [shape, setShape] = React.useState<number[]>(() => seededWaveform(title, 96));
  const [barCount, setBarCount] = React.useState(72);
  const [hoverRatio, setHoverRatio] = React.useState<number | null>(null);

  React.useEffect(() => {
    let disposed = false;
    void decodeWaveform(src).then((result) => {
      if (disposed) return;
      if (result) setShape(result);
      setDecoding(false);
    });
    return () => {
      disposed = true;
    };
  }, [src]);

  // Metadata can finish loading before React hydrates, so the event is missed.
  React.useEffect(() => {
    const element = audioRef.current;
    if (!element) return;
    if (element.readyState >= 1 && Number.isFinite(element.duration)) {
      setDuration(element.duration);
    }
  }, [src]);

  React.useEffect(() => {
    const element = waveRef.current;
    if (!element) return;
    const update = () => {
      const width = element.getBoundingClientRect().width;
      if (width <= 0) return;
      const count = Math.round(Math.min(MAX_BARS, Math.max(MIN_BARS, width / BAR_SLOT)));
      setBarCount(count);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  async function toggle() {
    const element = audioRef.current;
    if (!element) return;
    if (element.paused) {
      try {
        await element.play();
      } catch {
        // Ignore autoplay / network failures.
      }
    } else {
      element.pause();
    }
  }

  function ratioFromEvent(event: React.MouseEvent<HTMLDivElement>): number {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  }

  function seek(event: React.MouseEvent<HTMLDivElement>) {
    const element = audioRef.current;
    if (!element || !Number.isFinite(element.duration) || element.duration <= 0) return;
    const ratio = ratioFromEvent(event);
    element.currentTime = ratio * element.duration;
    setCurrent(element.currentTime);
  }

  function seekWithKeyboard(event: React.KeyboardEvent<HTMLDivElement>) {
    const element = audioRef.current;
    if (!element || !Number.isFinite(element.duration) || element.duration <= 0) return;
    const delta = event.key === "ArrowRight" ? 5 : event.key === "ArrowLeft" ? -5 : 0;
    if (!delta) return;
    event.preventDefault();
    element.currentTime = Math.min(element.duration, Math.max(0, element.currentTime + delta));
    setCurrent(element.currentTime);
  }

  const bars = React.useMemo(() => resample(shape, barCount), [shape, barCount]);
  const progress = duration > 0 ? current / duration : 0;
  const activeBars = Math.round(progress * bars.length);

  return (
    <div className={cn("flex w-full items-center gap-5 p-4 sm:gap-6 sm:p-5", className)}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        className="hidden"
      />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause sound effect" : "Play sound effect"}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border/70 text-foreground/90 transition-colors hover:border-foreground/40 hover:bg-foreground/5 active:scale-95"
      >
        {playing ? (
          <Pause className="size-4" weight="fill" />
        ) : (
          <Play className="size-4 translate-x-px fill-current" weight="fill" />
        )}
      </button>

      <div
        ref={waveRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek audio"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(current)}
        onClick={seek}
        onKeyDown={seekWithKeyboard}
        onMouseMove={(e) => setHoverRatio(ratioFromEvent(e))}
        onMouseLeave={() => setHoverRatio(null)}
        className="relative flex-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <div
          className={cn(
            "flex h-12 items-center gap-[2px] transition-opacity duration-300",
            decoding && "opacity-50"
          )}
          aria-hidden
        >
          {bars.map((value, index) => {
            const played = index <= activeBars;
            return (
              <div
                key={index}
                className="flex h-full min-w-[2px] flex-1 items-center justify-center"
              >
                <span
                  className={cn(
                    "w-[2px] rounded-full transition-colors duration-150",
                    played ? "bg-foreground/90" : "bg-foreground/25"
                  )}
                  style={{ height: `${Math.max(10, value)}%` }}
                />
              </div>
            );
          })}
        </div>

        {hoverRatio !== null && (
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-foreground/30"
            style={{ left: `${hoverRatio * 100}%` }}
          />
        )}
      </div>

      <div className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {playing ? `${formatClock(current)} / ${formatClock(duration)}` : formatClock(duration)}
      </div>
    </div>
  );
}
