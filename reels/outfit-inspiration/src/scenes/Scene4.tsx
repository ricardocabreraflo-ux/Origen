import { AbsoluteFill, staticFile } from "remotion";
import { KenBurnsPhoto } from "../components/KenBurnsPhoto";
import { BottomScrim } from "../components/BottomScrim";
import { FadeRiseIn } from "../components/FadeRiseIn";
import { IgIcon } from "../components/IgIcon";
import { COLORS, SAFE, TEXT } from "../theme";
import { ARCHIVO, FRAUNCES } from "../fonts";

export const SCENE4_DURATION = 90; // 3.0s @ 30fps

export const Scene4: React.FC = () => {
  return (
    <AbsoluteFill>
      <KenBurnsPhoto src={staticFile("photos/C.jpeg")} durationInFrames={SCENE4_DURATION} zoomTo={1.06} />
      <BottomScrim height={1050} />
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
          CITA
        </div>
        <div
          style={{
            fontFamily: FRAUNCES,
            fontWeight: 600,
            fontSize: TEXT.main,
            color: COLORS.bone,
            marginBottom: 36,
          }}
        >
          Sábado 8 de Agosto · 5:00 PM
        </div>
        <div
          style={{
            height: 1,
            background: COLORS.camel,
            marginBottom: 30,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <IgIcon size={26} color={COLORS.camel} />
          <span
            style={{
              fontFamily: ARCHIVO,
              fontWeight: 600,
              fontSize: 24,
              color: COLORS.camelPale,
            }}
          >
            @origen.brows
          </span>
        </div>
      </FadeRiseIn>
    </AbsoluteFill>
  );
};
