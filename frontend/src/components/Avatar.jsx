// Generates a consistent colored avatar from a user's name
const COLORS = [
  ["#6c63ff", "#8b85ff"],
  ["#f59e0b", "#fbbf24"],
  ["#10b981", "#34d399"],
  ["#ef4444", "#f87171"],
  ["#3b82f6", "#60a5fa"],
  ["#8b5cf6", "#a78bfa"],
  ["#ec4899", "#f472b6"],
  ["#14b8a6", "#2dd4bf"],
];

function getColorIndex(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % COLORS.length;
  }
  return hash;
}

function getInitials(name = "") {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Avatar({ name = "", size = 40 }) {
  const idx = getColorIndex(name);
  const [from, to] = COLORS[idx];
  const initials = getInitials(name);
  const fontSize = size * 0.36;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${from}, ${to})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "var(--font-sans)",
        fontWeight: 600,
        fontSize,
        color: "white",
        letterSpacing: "0.5px",
        userSelect: "none",
      }}
    >
      {initials}
    </div>
  );
}
