import { Composition } from "remotion";
import { OutfitReel, TOTAL_DURATION } from "./OutfitReel";
import { CountdownReminder, COUNTDOWN_DURATION } from "./scenes/CountdownReminder";
import { CountdownCollage, COLLAGE_DURATION } from "./scenes/CountdownCollage";
import { CountdownSequence, COUNTDOWN_SEQ_DURATION } from "./scenes/CountdownSequence";
import { CountdownHero, COUNTDOWN_HERO_DURATION } from "./scenes/CountdownHero";

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

export const CountdownCollageComposition = () => {
  return (
    <Composition
      id="CountdownCollage"
      component={CountdownCollage}
      durationInFrames={COLLAGE_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};

export const CountdownSequenceComposition = () => {
  return (
    <Composition
      id="CountdownSequence"
      component={CountdownSequence}
      durationInFrames={COUNTDOWN_SEQ_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};

export const CountdownHeroComposition = () => {
  return (
    <Composition
      id="CountdownHero"
      component={CountdownHero}
      durationInFrames={COUNTDOWN_HERO_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
