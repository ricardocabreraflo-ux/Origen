import { CanvasImage, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const KenBurnsPhoto: React.FC<{
  src: string;
  durationInFrames: number;
  zoomTo?: number;
}> = ({ src, durationInFrames, zoomTo = 1.08 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [1, zoomTo], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.33, 0, 0.67, 1),
    output: "perceptual-scale",
  });

  return (
    <CanvasImage
      src={src}
      width={width}
      height={height}
      fit="cover"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        scale,
      }}
    />
  );
};
