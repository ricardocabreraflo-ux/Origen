import { AbsoluteFill, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { KenBurnsPhoto } from "../components/KenBurnsPhoto";
import { BottomScrim } from "../components/BottomScrim";
import { FadeRiseIn } from "../components/FadeRiseIn";
import { TopBrandMark } from "../components/TopBrandMark";
import { COLORS, SAFE, TEXT } from "../theme";
import { FRAUNCES } from "../fonts";

const SEQ_SCENE_DURATION = 80; // 2.67s @ 30fps
const SEQ_TRANSITION = 15; // 0.5s
export const COUNTDOWN_SEQ_DURATION = SEQ_SCENE_DURATION * 3 - SEQ_TRANSITION * 2; // 7.0s

const SeqScene: React.FC<{ src: string; children: React.ReactNode; scrimHeight?: number }> = ({
  src,
  children,
  scrimHeight,
}) => (
  <AbsoluteFill>
    <KenBurnsPhoto src={src} durationInFrames={SEQ_SCENE_DURATION} zoomTo={1.1} />
    <BottomScrim height={scrimHeight} />
    <FadeRiseIn
      delay={8}
      style={{ position: "absolute", left: SAFE.side, right: SAFE.side, bottom: SAFE.bottom }}
    >
      {children}
    </FadeRiseIn>
  </AbsoluteFill>
);

export const CountdownSequence: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SEQ_SCENE_DURATION} name="Teaser">
          <SeqScene src={staticFile("photos/B.jpeg")}>
            <div style={{ fontFamily: FRAUNCES, fontWeight: 600, fontSize: TEXT.main, color: COLORS.bone }}>
              ¡Faltan pocos días! 🗓️✨
            </div>
          </SeqScene>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: SEQ_TRANSITION })} />

        <TransitionSeries.Sequence durationInFrames={SEQ_SCENE_DURATION} name="DressCode">
          <SeqScene src={staticFile("photos/D.jpeg")}>
            <div
              style={{
                fontFamily: FRAUNCES,
                fontWeight: 400,
                fontSize: 34,
                color: COLORS.camelPale,
                marginBottom: 16,
              }}
            >
              Recordatorio de Dress Code para nuestra inauguración:
            </div>
            <div style={{ fontFamily: FRAUNCES, fontWeight: 600, fontSize: TEXT.main, color: COLORS.bone }}>
              Colores neutros y claros.
            </div>
          </SeqScene>
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: SEQ_TRANSITION })} />

        <TransitionSeries.Sequence durationInFrames={SEQ_SCENE_DURATION} name="CTA">
          <SeqScene src={staticFile("photos/C.jpeg")} scrimHeight={1100}>
            <div
              style={{
                fontFamily: FRAUNCES,
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 52,
                color: COLORS.bone,
              }}
            >
              ¿Ya tienes listo tu look?
            </div>
          </SeqScene>
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <TopBrandMark />
    </AbsoluteFill>
  );
};
