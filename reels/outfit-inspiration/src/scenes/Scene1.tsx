import { AbsoluteFill, staticFile } from "remotion";
import { KenBurnsPhoto } from "../components/KenBurnsPhoto";
import { BottomScrim } from "../components/BottomScrim";
import { FadeRiseIn } from "../components/FadeRiseIn";
import { COLORS, SAFE, TEXT } from "../theme";
import { FRAUNCES } from "../fonts";

export const SCENE1_DURATION = 87; // 2.9s @ 30fps

export const Scene1: React.FC = () => {
  return (
    <AbsoluteFill>
      <KenBurnsPhoto src={staticFile("photos/A.jpeg")} durationInFrames={SCENE1_DURATION} zoomTo={1.07} />
      <BottomScrim />
      <FadeRiseIn
        delay={10}
        style={{
          position: "absolute",
          left: SAFE.side,
          right: SAFE.side,
          bottom: SAFE.bottom,
        }}
      >
        <div
          style={{
            fontFamily: FRAUNCES,
            fontWeight: 600,
            fontSize: TEXT.main,
            lineHeight: 1.15,
            color: COLORS.bone,
          }}
        >
          Inspiración para
          <br />
          tu outfit 🤍
        </div>
      </FadeRiseIn>
    </AbsoluteFill>
  );
};
