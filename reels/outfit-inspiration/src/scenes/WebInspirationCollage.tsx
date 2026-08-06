import { AbsoluteFill, CanvasImage, staticFile } from "remotion";
import { FadeRiseIn } from "../components/FadeRiseIn";
import { TopBrandMark } from "../components/TopBrandMark";
import { COLORS, SAFE } from "../theme";
import { ARCHIVO, FRAUNCES } from "../fonts";

export const WEB_COLLAGE_DURATION = 90; // 3s @ 30fps (mostly a still, brief settle-in)

const Photo: React.FC<{
  src: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  delay: number;
}> = ({ src, label, x, y, w, h, delay }) => (
  <FadeRiseIn
    delay={delay}
    rise={26}
    style={{ position: "absolute", left: x, top: y, width: w, height: h, overflow: "hidden" }}
  >
    <CanvasImage src={src} width={w} height={h} fit="cover" style={{ position: "absolute", top: 0, left: 0 }} />
    <div
      style={{
        position: "absolute",
        left: 18,
        bottom: 16,
        fontFamily: ARCHIVO,
        fontWeight: 600,
        fontSize: 15,
        letterSpacing: 3,
        color: COLORS.bone,
        textShadow: "0 1px 10px rgba(0,0,0,0.65)",
      }}
    >
      {label}
    </div>
  </FadeRiseIn>
);

export const WebInspirationCollage: React.FC = () => {
  const contentX = SAFE.side;
  const contentW = 1080 - 2 * SAFE.side;

  const headTop = 250;
  const gridTop = 470;
  const gridH = 700;
  const leftW = 580;
  const gap = 20;
  const rightW = contentW - leftW - gap;
  const rightTopH = 400;
  const rightBottomH = gridH - rightTopH - gap;

  const textTop = gridTop + gridH + 56;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bone }}>
      <TopBrandMark />

      <FadeRiseIn delay={10} style={{ position: "absolute", left: contentX, top: headTop }}>
        <div
          style={{
            fontFamily: ARCHIVO,
            fontWeight: 600,
            fontSize: 20,
            letterSpacing: 5,
            color: COLORS.camel,
            marginBottom: 12,
          }}
        >
          NUEVO COMIENZO
        </div>
        <div
          style={{
            fontFamily: FRAUNCES,
            fontWeight: 600,
            fontSize: 64,
            lineHeight: 1.1,
            color: COLORS.ink,
          }}
        >
          Inspiración para
          <br />
          tu outfit 🤍
        </div>
      </FadeRiseIn>

      <Photo
        src={staticFile("photos/web/look2.jpg")}
        label="BEIGE TOTAL"
        x={contentX}
        y={gridTop}
        w={leftW}
        h={gridH}
        delay={30}
      />
      <Photo
        src={staticFile("photos/web/look1.jpg")}
        label="BLANCO SASTRE"
        x={contentX + leftW + gap}
        y={gridTop}
        w={rightW}
        h={rightTopH}
        delay={42}
      />
      <Photo
        src={staticFile("photos/web/look3.jpg")}
        label="VESTIDO CREMA"
        x={contentX + leftW + gap}
        y={gridTop + rightTopH + gap}
        w={rightW}
        h={rightBottomH}
        delay={54}
      />

      <FadeRiseIn delay={70} style={{ position: "absolute", left: contentX, top: textTop, width: contentW }}>
        <div
          style={{
            height: 1,
            background: COLORS.camel,
            marginBottom: 34,
          }}
        />
        <div
          style={{
            fontFamily: FRAUNCES,
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 34,
            lineHeight: 1.3,
            color: COLORS.ink,
            marginBottom: 40,
          }}
        >
          Queremos que seas parte del nuevo comienzo de Origen Brows.
        </div>

        <div
          style={{
            fontFamily: ARCHIVO,
            fontWeight: 600,
            fontSize: 18,
            letterSpacing: 5,
            color: COLORS.camel,
            marginBottom: 10,
          }}
        >
          CITA
        </div>
        <div
          style={{
            fontFamily: FRAUNCES,
            fontWeight: 600,
            fontSize: 44,
            color: COLORS.ink,
            marginBottom: 34,
          }}
        >
          Sábado 8 de Agosto · 5:00 PM
        </div>

        <div
          style={{
            fontFamily: ARCHIVO,
            fontWeight: 600,
            fontSize: 18,
            letterSpacing: 5,
            color: COLORS.camel,
            marginBottom: 10,
          }}
        >
          DRESS CODE
        </div>
        <div
          style={{
            fontFamily: FRAUNCES,
            fontWeight: 600,
            fontSize: 44,
            color: COLORS.ink,
          }}
        >
          Tonos neutros / claros
        </div>
      </FadeRiseIn>
    </AbsoluteFill>
  );
};
