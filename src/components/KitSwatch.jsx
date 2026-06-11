// Kit shirt graphic + colour helpers shared by setup, draft header and transitions.

function luminance(hex) {
  let h = (hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (h.length !== 6) return 0;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Black or white, whichever reads better on the given colour
export function readableTextOn(hex) {
  return luminance(hex) > 0.45 ? "#000000" : "#ffffff";
}

// The kit colour that stands out best against the app's dark background —
// falls back to the amber accent when both kit colours are too dark.
export function kitAccent(primary, secondary) {
  if (luminance(secondary) > 0.3) return secondary;
  if (luminance(primary) > 0.3) return primary;
  return "#ffd700";
}

export default function KitSwatch({ primary, secondary, pattern = "plain", uid = "0", size = 36 }) {
  const patId = `stripe-${uid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" style={{ flexShrink: 0 }}>
      {pattern === "stripes" && (
        <defs>
          <pattern id={patId} x="0" y="0" width="4" height="28" patternUnits="userSpaceOnUse">
            <rect width="2" height="28" fill={primary} />
            <rect x="2" width="2" height="28" fill={secondary} />
          </pattern>
        </defs>
      )}
      <path d="M10 2 L4 7 L7 9 L7 24 L21 24 L21 9 L24 7 L18 2 L15 5 L13 5 Z"
        fill={pattern === "stripes" ? `url(#${patId})` : primary}
        stroke={secondary} strokeWidth="1.5" />
      <path d="M10 2 L13 5 L15 5 L18 2 L15 7 L13 7 Z" fill={secondary} />
    </svg>
  );
}
