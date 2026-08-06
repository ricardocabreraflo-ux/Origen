import { interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../theme";

export const ArchMotif: React.FC<{ color?: string; top?: number }> = ({
  color = COLORS.camel,
  top = 230,
}) => {
  const frame = useCurrentFrame();
  const sweep = interpolate(frame, [0, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <svg
      width="1080"
      height="1920"
      viewBox="0 0 1080 1920"
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <path
        d={`M ${540 - 150} ${top} A 300 300 0 0 1 ${540 + 150} ${top}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={942}
        strokeDashoffset={942 * (1 - sweep)}
      />
    </svg>
  );
};
