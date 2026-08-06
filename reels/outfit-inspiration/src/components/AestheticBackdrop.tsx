import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";

export const AestheticBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const drift = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const glowScale = 1 + Math.sin(drift * Math.PI * 2) * 0.04;
  const archSweep = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bone }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 560,
          width: 1100,
          height: 1100,
          translate: "-50% -50%",
          scale: glowScale,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.camelPale} 0%, ${COLORS.camelPale}00 68%)`,
        }}
      />
      <svg
        width="1080"
        height="1920"
        viewBox="0 0 1080 1920"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <path
          d={`M 390 250 A 300 300 0 0 1 690 250`}
          fill="none"
          stroke={COLORS.camel}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={942}
          strokeDashoffset={942 * (1 - archSweep)}
        />
      </svg>
    </AbsoluteFill>
  );
};
