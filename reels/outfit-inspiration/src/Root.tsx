import "./index.css";
import "./fonts";
import {
  OutfitReelComposition,
  CountdownReminderComposition,
  CountdownCollageComposition,
  CountdownSequenceComposition,
  CountdownHeroComposition,
  WebInspirationCollageComposition,
} from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <OutfitReelComposition />
      <CountdownReminderComposition />
      <CountdownCollageComposition />
      <CountdownSequenceComposition />
      <CountdownHeroComposition />
      <WebInspirationCollageComposition />
    </>
  );
};
