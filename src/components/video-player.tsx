"use client";

import * as React from "react";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/sliders.css";

import {
  MediaPlayer,
  MediaProvider,
  Controls,
  PlayButton,
  MuteButton,
  FullscreenButton,
  Time,
  TimeSlider,
  VolumeSlider,
  Gesture,
  useMediaState,
  type MediaPlayerInstance,
} from "@vidstack/react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  title?: string;
  width?: number | null;
  height?: number | null;
}

export function VideoPlayer({
  src,
  poster,
  className,
  autoPlay = true,
  loop = true,
  title,
  width,
  height,
}: VideoPlayerProps) {
  const [mounted, setMounted] = React.useState(false);
  const playerRef = React.useRef<MediaPlayerInstance>(null);
  const isPaused = useMediaState("paused", playerRef);
  const isMuted = useMediaState("muted", playerRef);
  const isFullscreen = useMediaState("fullscreen", playerRef);

  const [dimensions, setDimensions] = React.useState<{
    width: number;
    height: number;
  }>({
    width: width ?? 0,
    height: height ?? 0,
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (width && height && (width !== dimensions.width || height !== dimensions.height)) {
      setDimensions({ width, height });
    }
  }, [width, height]);

  const effectiveWidth = dimensions.width || width || 1920;
  const effectiveHeight = dimensions.height || height || 1080;
  const isPortrait = effectiveHeight > effectiveWidth;

  // Responsive container sizing:
  // - Portrait: locks height to viewport (calc(100vh - 8rem)) and scales width naturally via aspect-ratio.
  // - Landscape: fills available width and bounds max height.
  const containerStyle: React.CSSProperties = isPortrait
    ? {
        aspectRatio: `${effectiveWidth} / ${effectiveHeight}`,
        height: "calc(100vh - 8rem)",
        maxHeight: "calc(100vh - 8rem)",
        maxWidth: "100%",
        width: "auto",
      }
    : {
        aspectRatio: `${effectiveWidth} / ${effectiveHeight}`,
        width: "100%",
        maxWidth: `calc((100vh - 8rem) * (${effectiveWidth} / ${effectiveHeight}))`,
        maxHeight: "calc(100vh - 8rem)",
        height: "auto",
      };

  React.useEffect(() => {
    if (mounted && autoPlay && playerRef.current) {
      playerRef.current.play?.().catch(() => {});
    }
  }, [mounted, autoPlay, src]);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl bg-black shadow-2xl mx-auto select-none",
        className
      )}
      style={containerStyle}
    >
      <MediaPlayer
        ref={playerRef}
        src={src}
        poster={poster}
        load="eager"
        autoplay={autoPlay}
        loop={loop}
        muted
        playsInline
        aspectRatio={`${effectiveWidth}/${effectiveHeight}`}
        onLoadedMetadata={(event) => {
          const video = ((event?.target as unknown) ?? playerRef.current?.el?.querySelector("video")) as HTMLVideoElement | null;
          if (video && video.videoWidth > 0 && video.videoHeight > 0) {
            setDimensions({
              width: video.videoWidth,
              height: video.videoHeight,
            });
          }
          if (autoPlay && playerRef.current) {
            playerRef.current.play?.().catch(() => {});
          }
        }}
        className="group/player size-full rounded-2xl overflow-hidden text-white"
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <MediaProvider className="size-full" />

        {/* Gestures for tap/click play-pause and fullscreen */}
        <Gesture
          event="pointerup"
          action="toggle:paused"
          className="absolute inset-0 z-0"
        />
        <Gesture
          event="dblpointerup"
          action="toggle:fullscreen"
          className="absolute inset-0 z-0"
        />

        {/* Controls Overlay */}
        <Controls.Root
          className={cn(
            "absolute inset-0 z-20 pointer-events-none flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/30 to-transparent px-3.5 pb-3.5 pt-12 transition-opacity duration-200",
            "opacity-0 group-hover/player:opacity-100 data-[visible]:opacity-100 media-controls:opacity-100",
            isPaused && "opacity-100"
          )}
        >
          <div className="flex flex-col gap-1.5 w-full pointer-events-auto">
            {/* Custom TimeSlider with native synchronized thumb and track */}
            <TimeSlider.Root
              className="vds-slider group relative w-full h-5 flex items-center cursor-pointer select-none touch-none outline-none pointer-events-auto"
              style={
                {
                  "--media-slider-height": "20px",
                  "--media-slider-track-height": "4px",
                  "--media-slider-focused-track-height": "6px",
                  "--media-slider-thumb-size": "13px",
                  "--media-slider-track-fill-bg": "#818cf8",
                  "--media-slider-track-bg": "rgba(255, 255, 255, 0.25)",
                  "--media-slider-track-progress-bg": "rgba(255, 255, 255, 0.4)",
                  "--media-slider-thumb-border": "2px solid rgba(255, 255, 255, 0.9)",
                  "--media-slider-thumb-bg": "#ffffff",
                  "--media-slider-track-border-radius": "9999px",
                  "--media-slider-thumb-border-radius": "9999px",
                } as any
              }
            >
              <TimeSlider.Track className="vds-slider-track rounded-full">
                <TimeSlider.TrackFill className="vds-slider-track-fill rounded-full" />
                <TimeSlider.Progress className="vds-slider-progress rounded-full" />
              </TimeSlider.Track>
              <TimeSlider.Thumb className="vds-slider-thumb !opacity-100 shadow-md" />
            </TimeSlider.Root>

            {/* Bottom Bar: Play, Mute, Time, Fullscreen */}
            <div className="flex items-center justify-between text-white pointer-events-auto">
              <div className="flex items-center gap-1 pointer-events-auto">
                <PlayButton className="flex size-8 cursor-pointer pointer-events-auto items-center justify-center rounded-full hover:bg-white/15 active:scale-95 transition-all">
                  {isPaused ? (
                    <Play className="size-4 fill-white translate-x-0.5 pointer-events-none" />
                  ) : (
                    <Pause className="size-4 fill-white pointer-events-none" />
                  )}
                </PlayButton>

                {/* Unified Volume Pill */}
                <div className="flex items-center rounded-full hover:bg-white/15 transition-all group/volume px-0.5 pointer-events-auto">
                  <MuteButton className="flex size-8 cursor-pointer pointer-events-auto items-center justify-center rounded-full active:scale-95 transition-all">
                    {isMuted ? (
                      <VolumeX className="size-4 pointer-events-none" />
                    ) : (
                      <Volume2 className="size-4 pointer-events-none" />
                    )}
                  </MuteButton>

                  <div className="w-0 group-hover/volume:w-16 overflow-visible transition-[width] duration-200 flex items-center group-hover/volume:px-2 pointer-events-auto">
                    <VolumeSlider.Root
                      className="vds-slider relative w-full h-5 flex items-center cursor-pointer select-none touch-none outline-none pointer-events-auto"
                      style={
                        {
                          "--media-slider-height": "20px",
                          "--media-slider-track-height": "4px",
                          "--media-slider-thumb-size": "10px",
                          "--media-slider-track-fill-bg": "#818cf8",
                          "--media-slider-track-bg": "rgba(255, 255, 255, 0.25)",
                          "--media-slider-thumb-bg": "#ffffff",
                          "--media-slider-track-border-radius": "9999px",
                          "--media-slider-thumb-border-radius": "9999px",
                        } as any
                      }
                    >
                      <VolumeSlider.Track className="vds-slider-track rounded-full">
                        <VolumeSlider.TrackFill className="vds-slider-track-fill rounded-full" />
                      </VolumeSlider.Track>
                      <VolumeSlider.Thumb className="vds-slider-thumb opacity-0 group-hover/volume:!opacity-100 transition-opacity shadow-sm" />
                    </VolumeSlider.Root>
                  </div>
                </div>

                <div className="flex items-center gap-1 pl-2 text-xs font-medium tabular-nums text-white/85 select-none pointer-events-none">
                  <Time type="current" />
                  <span className="text-white/50">/</span>
                  <Time type="duration" />
                </div>
              </div>

              <div className="flex items-center gap-1 pointer-events-auto">
                <FullscreenButton className="flex size-8 cursor-pointer pointer-events-auto items-center justify-center rounded-full hover:bg-white/15 active:scale-95 transition-all">
                  {isFullscreen ? (
                    <Minimize className="size-4 pointer-events-none" />
                  ) : (
                    <Maximize className="size-4 pointer-events-none" />
                  )}
                </FullscreenButton>
              </div>
            </div>
          </div>
        </Controls.Root>
      </MediaPlayer>
    </div>
  );
}
