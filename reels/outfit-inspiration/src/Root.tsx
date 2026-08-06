import "./index.css";
import "./fonts";
import { OutfitReelComposition, CountdownReminderComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <OutfitReelComposition />
      <CountdownReminderComposition />
    </>
  );
};
