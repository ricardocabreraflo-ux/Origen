import { AbsoluteFill, CanvasImage, Easing, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FadeRiseIn } from "../components/FadeRiseIn";
import { TopBrandMark } from "../components/TopBrandMark";
import { COLORS, SAFE } from "../theme";
import { ARCHIVO, FRAUNCES } from "../fonts";

export const COLLAGE_DURATION = 210; // 7s @ 30fps

const Panel: React.FC<{
  src: string;
  label: string;
  delay: number;
  width: number;
  height: number;
  style?: React.CSSProperties;
}> = ({ src, label, delay, width, height, style }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, COLLAGE_DURATION], [1, 1.05], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.33, 0, 0.67, 1),
    output: "perceptual-scale",
  });

  return (
    <FadeRiseIn
      delay={delay}
      rise={30}
      style={{ position: "absolute", overflow: "hidden", width, height, ...style }}
    >
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <CanvasImage
          src={src}
          width={width}
          height={height}
          fit="cover"
          style={{ position: "absolute", top: 0, left: 0, scale: zoom }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 20,
          bottom: 18,
          fontFamily: ARCHIVO,
          fontWeight: 600,
          fontSize: 16,
          letterSpacing: 3,
          color: COLORS.bone,
          textShadow: "0 1px 8px rgba(0,0,0,0.6)",
        }}
      >
        {label}
      </div>
    </FadeRiseIn>
  );
};

export const CountdownCollage: React.FC = () => {
  const panelTop = 260;
  const panelHeight = 620;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bone }}>
      <TopBrandMark />

      <Panel
        src={staticFile("photos/D.jpeg")}
        label="LOOK · BLANCO"
        delay={10}
        width={460}
        height={panelHeight}
        style={{ left: SAFE.side, top: panelTop, borderRadius: 6 }}
      />
      <Panel
        src={staticFile("photos/A.jpeg")}
        label="LOOK · ELEGANTE"
        delay={22}
        width={460}
        height={panelHeight}
        style={{ left: SAFE.side + 460 + 20, top: panelTop, borderRadius: 6 }}
      />

      <AbsoluteFill
        style={{
          top: panelTop + panelHeight + 60,
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div style={{ width: 900 }}>
          <FadeRiseIn delay={45}>
            <div
              style={{
                fontFamily: FRAUNCES,
                fontWeight: 600,
                fontSize: 58,
                lineHeight: 1.15,
                color: COLORS.ink,
                marginBottom: 30,
              }}
            >
              ¡Faltan pocos días! 🗓️✨
            </div>
          </FadeRiseIn>

          <FadeRiseIn delay={68}>
            <div
              style={{
                fontFamily: ARCHIVO,
                fontWeight: 400,
                fontSize: 28,
                lineHeight: 1.4,
                color: COLORS.camelDeep,
                marginBottom: 18,
              }}
            >
              Recordatorio de Dress Code para nuestra inauguración:
            </div>
          </FadeRiseIn>

          <FadeRiseIn delay={90}>
            <div
              style={{
                fontFamily: FRAUNCES,
                fontWeight: 600,
                fontSize: 56,
                color: COLORS.ink,
                marginBottom: 30,
              }}
            >
              Colores neutros y claros.
            </div>
          </FadeRiseIn>

          <FadeRiseIn delay={115}>
            <div
              style={{
                fontFamily: FRAUNCES,
                fontStyle: "italic",
                fontSize: 44,
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
