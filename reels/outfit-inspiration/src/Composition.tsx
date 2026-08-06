import { Composition } from "remotion";
import { OutfitReel, TOTAL_DURATION } from "./OutfitReel";
import { CountdownReminder, COUNTDOWN_DURATION } from "./scenes/CountdownReminder";

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

export const CountdownReminderComposition = () => {
  return (
    <Composition
      id="CountdownReminder"
      component={CountdownReminder}
      durationInFrames={COUNTDOWN_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
