import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export const FadeRiseIn: React.FC<{
  delay?: number;
  rise?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ delay = 0, rise = 26, style, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - delay);

  const progress = spring({
    frame: local,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });

  return (
    <div
      style={{
        opacity: progress,
        translate: `0px ${(1 - progress) * rise}px`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
