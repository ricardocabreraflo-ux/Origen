import { AbsoluteFill, staticFile } from "remotion";
import { KenBurnsPhoto } from "../components/KenBurnsPhoto";
import { BottomScrim } from "../components/BottomScrim";
import { FadeRiseIn } from "../components/FadeRiseIn";
import { COLORS, SAFE, TEXT } from "../theme";
import { ARCHIVO, FRAUNCES } from "../fonts";

export const SCENE3_DURATION = 75; // 2.5s @ 30fps

export const Scene3: React.FC = () => {
  return (
    <AbsoluteFill>
      <KenBurnsPhoto src={staticFile("photos/D.jpeg")} durationInFrames={SCENE3_DURATION} zoomTo={1.07} />
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
            fontFamily: ARCHIVO,
            fontWeight: 600,
            fontSize: TEXT.label,
            letterSpacing: 5,
            color: COLORS.camel,
            marginBottom: 18,
          }}
        >
          DRESS CODE
        </div>
        <div
          style={{
            fontFamily: FRAUNCES,
            fontWeight: 600,
            fontSize: TEXT.main,
            color: COLORS.bone,
          }}
        >
          Tonos neutros / claros
        </div>
      </FadeRiseIn>
    </AbsoluteFill>
  );
};
