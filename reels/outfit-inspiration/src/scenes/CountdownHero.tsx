import { AbsoluteFill, staticFile } from "remotion";
import { KenBurnsPhoto } from "../components/KenBurnsPhoto";
import { BottomScrim } from "../components/BottomScrim";
import { FadeRiseIn } from "../components/FadeRiseIn";
import { TopBrandMark } from "../components/TopBrandMark";
import { ArchMotif } from "../components/ArchMotif";
import { COLORS, SAFE } from "../theme";
import { ARCHIVO, FRAUNCES } from "../fonts";

export const COUNTDOWN_HERO_DURATION = 210; // 7s @ 30fps

export const CountdownHero: React.FC = () => {
  return (
    <AbsoluteFill>
      <KenBurnsPhoto src={staticFile("photos/D.jpeg")} durationInFrames={COUNTDOWN_HERO_DURATION} zoomTo={1.08} />
      <BottomScrim height={1250} />
      <ArchMotif color={COLORS.camelPale} top={210} />
      <TopBrandMark />

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-end",
          textAlign: "center",
          paddingBottom: SAFE.bottom,
        }}
      >
        <div style={{ width: 900 }}>
          <FadeRiseIn delay={20}>
            <div
              style={{
                fontFamily: FRAUNCES,
                fontWeight: 600,
                fontSize: 60,
                lineHeight: 1.15,
                color: COLORS.bone,
                marginBottom: 26,
              }}
            >
              ¡Faltan pocos días! 🗓️✨
            </div>
          </FadeRiseIn>

          <FadeRiseIn delay={48}>
            <div
              style={{
                fontFamily: ARCHIVO,
                fontWeight: 400,
                fontSize: 28,
                lineHeight: 1.4,
                color: COLORS.camelPale,
                marginBottom: 16,
              }}
            >
              Recordatorio de Dress Code para nuestra inauguración:
            </div>
          </FadeRiseIn>

          <FadeRiseIn delay={72}>
            <div
              style={{
                fontFamily: FRAUNCES,
                fontWeight: 600,
                fontSize: 56,
                color: COLORS.bone,
                marginBottom: 28,
              }}
            >
              Colores neutros y claros.
            </div>
          </FadeRiseIn>

          <FadeRiseIn delay={100}>
            <div
              style={{
                fontFamily: FRAUNCES,
                fontStyle: "italic",
                fontSize: 42,
                color: COLORS.camelPale,
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
