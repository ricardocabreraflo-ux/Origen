import { AbsoluteFill } from "remotion";
import { COLORS } from "../theme";

export const BottomScrim: React.FC<{ height?: number }> = ({ height = 980 }) => {
  return (
    <AbsoluteFill
      style={{
        top: "auto",
        height,
        background: `linear-gradient(to bottom, ${COLORS.ink}00 0%, ${COLORS.ink}eb 58%, ${COLORS.ink}eb 100%)`,
      }}
    />
  );
};
