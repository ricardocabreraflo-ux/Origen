import { Composition } from "remotion";
import { OutfitReel, TOTAL_DURATION } from "./OutfitReel";

export const OutfitReelComposition = () => {
  return (
    <Composition
      id="OutfitInspiration"
      component={OutfitReel}
      durationInFrames={TOTAL_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
