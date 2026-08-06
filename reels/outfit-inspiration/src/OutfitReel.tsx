import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { Scene1, SCENE1_DURATION } from "./scenes/Scene1";
import { Scene2, SCENE2_DURATION } from "./scenes/Scene2";
import { Scene3, SCENE3_DURATION } from "./scenes/Scene3";
import { Scene4, SCENE4_DURATION } from "./scenes/Scene4";
import { TopBrandMark } from "./components/TopBrandMark";
import { COLORS } from "./theme";

export const TRANSITION_FRAMES = 15; // 0.5s crossfade @ 30fps

export const TOTAL_DURATION =
  SCENE1_DURATION + SCENE2_DURATION + SCENE3_DURATION + SCENE4_DURATION - 3 * TRANSITION_FRAMES;

export const OutfitReel: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE1_DURATION} name="Scene1">
          <Scene1 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE2_DURATION} name="Scene2">
          <Scene2 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE3_DURATION} name="Scene3">
          <Scene3 />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />
        <TransitionSeries.Sequence durationInFrames={SCENE4_DURATION} name="Scene4">
          <Scene4 />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <TopBrandMark />
    </AbsoluteFill>
  );
};
