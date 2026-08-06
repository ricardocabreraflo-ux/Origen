import { FadeRiseIn } from "./FadeRiseIn";
import { COLORS, SAFE } from "../theme";
import { ARCHIVO, FRAUNCES } from "../fonts";

export const TopBrandMark: React.FC = () => {
  const badgeSize = 60;

  return (
    <FadeRiseIn
      delay={4}
      rise={14}
      style={{
        position: "absolute",
        top: SAFE.top,
        left: SAFE.side,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "8px 26px 8px 8px",
          borderRadius: 999,
          background: `${COLORS.ink}5c`,
        }}
      >
        <div
          style={{
            width: badgeSize,
            height: badgeSize,
            borderRadius: "50%",
            background: COLORS.bone,
            border: `1px solid ${COLORS.camel}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: FRAUNCES,
              fontWeight: 700,
              fontSize: 34,
              color: COLORS.camelDeep,
              lineHeight: 1,
            }}
          >
            O
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontFamily: FRAUNCES,
              fontWeight: 600,
              fontSize: 25,
              letterSpacing: 3,
              color: COLORS.bone,
              lineHeight: 1,
            }}
          >
            ORIGEN BROWS
          </span>
          <span
            style={{
              fontFamily: ARCHIVO,
              fontWeight: 400,
              fontSize: 15,
              letterSpacing: 4,
              color: COLORS.camelPale,
              lineHeight: 1,
            }}
          >
            &amp; HAIR STUDIO
          </span>
        </div>
      </div>
    </FadeRiseIn>
  );
};
