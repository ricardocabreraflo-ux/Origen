import { AbsoluteFill, staticFile } from "remotion";
import { KenBurnsPhoto } from "../components/KenBurnsPhoto";
import { BottomScrim } from "../components/BottomScrim";
import { FadeRiseIn } from "../components/FadeRiseIn";
import { COLORS, SAFE, TEXT } from "../theme";
import { FRAUNCES } from "../fonts";

export const SCENE2_DURATION = 75; // 2.5s @ 30fps

export const Scene2: React.FC = () => {
  return (
    <AbsoluteFill>
      <KenBurnsPhoto src={staticFile("photos/B.jpeg")} durationInFrames={SCENE2_DURATION} zoomTo={1.12} />
      <BottomScrim />
      <FadeRiseIn
        delay={8}
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
            fontWeight: 400,
            fontSize: TEXT.main,
            lineHeight: 1.2,
            color: COLORS.bone,
          }}
        >
          Queremos que seas parte del nuevo comienzo de Origen Brows.
        </div>
      </FadeRiseIn>
    </AbsoluteFill>
  );
};
