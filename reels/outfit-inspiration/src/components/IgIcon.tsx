import { COLORS } from "../theme";

export const IgIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 26,
  color = COLORS.camel,
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="5.5" stroke={color} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" stroke={color} strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" r="1.1" fill={color} />
    </svg>
  );
};
