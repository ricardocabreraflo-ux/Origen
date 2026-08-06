import { AbsoluteFill } from "remotion";
import { AestheticBackdrop } from "../components/AestheticBackdrop";
import { FadeRiseIn } from "../components/FadeRiseIn";
import { TopBrandMark } from "../components/TopBrandMark";
import { COLORS } from "../theme";
import { ARCHIVO, FRAUNCES } from "../fonts";

export const COUNTDOWN_DURATION = 210; // 7s @ 30fps

export const CountdownReminder: React.FC = () => {
  return (
    <AbsoluteFill>
      <AestheticBackdrop />
      <TopBrandMark />

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div style={{ width: 900, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <FadeRiseIn delay={20}>
            <div
              style={{
                fontFamily: FRAUNCES,
                fontWeight: 600,
                fontSize: 64,
                lineHeight: 1.15,
                color: COLORS.ink,
                marginBottom: 34,
              }}
            >
              ¡Faltan pocos días! 🗓️✨
            </div>
          </FadeRiseIn>

          <FadeRiseIn delay={45}>
            <div
              style={{
                fontFamily: ARCHIVO,
                fontWeight: 400,
                fontSize: 32,
                lineHeight: 1.4,
                color: COLORS.camelDeep,
                marginBottom: 20,
              }}
            >
              Recordatorio de Dress Code
              <br />
              para nuestra inauguración:
            </div>
          </FadeRiseIn>

          <FadeRiseIn delay={70}>
            <div
              style={{
                fontFamily: FRAUNCES,
                fontWeight: 600,
                fontSize: 60,
                lineHeight: 1.15,
                color: COLORS.ink,
                marginBottom: 40,
              }}
            >
              Colores neutros y claros.
            </div>
          </FadeRiseIn>

          <FadeRiseIn delay={100}>
            <div
              style={{
                fontFamily: FRAUNCES,
                fontWeight: 400,
                fontStyle: "italic",
                fontSize: 48,
                color: COLORS.camelDeep,
              }}
            >
              ¿Ya tienes listo tu look?
            </div>
          </FadeRiseIn>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
