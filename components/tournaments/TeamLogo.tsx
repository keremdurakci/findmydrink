// Ported from the tournament HTML prototype's logoSVG(). Ten preset crest
// shapes, each rendered in the team's two chosen colors.
const SHAPES = [
  (a: string, b: string) => (
    <>
      <path d="M32 4 L56 14 V32 C56 46 44 56 32 60 C20 56 8 46 8 32 V14 Z" fill={a} />
      <path d="M32 14 L48 21 V32 C48 41 41 48 32 51 C23 48 16 41 16 32 V21 Z" fill={b} />
    </>
  ),
  (a: string, b: string) => (
    <>
      <circle cx="32" cy="32" r="30" fill={a} />
      <path d="M32 10 L38 26 L55 26 L41 36 L46 53 L32 43 L18 53 L23 36 L9 26 L26 26 Z" fill={b} />
    </>
  ),
  (a: string, b: string) => (
    <>
      <circle cx="32" cy="32" r="28" fill={a} />
      <path d="M32 4 A28 28 0 0 1 32 60 Z" fill={b} />
    </>
  ),
  (a: string, b: string) => (
    <>
      <circle cx="32" cy="32" r="28" fill={a} />
      <path d="M36 8 L16 34 H28 L24 56 L48 28 H34 Z" fill={b} />
    </>
  ),
  (a: string, b: string) => (
    <>
      <rect x="4" y="4" width="56" height="56" rx="10" fill={a} />
      <path d="M4 38 C14 28 20 28 30 38 C40 48 46 48 56 38 V56 H4 Z" fill={b} />
    </>
  ),
  (a: string, b: string) => (
    <>
      <rect x="20" y="20" width="24" height="24" transform="rotate(45 32 32)" fill={a} />
      <rect x="26" y="26" width="12" height="12" transform="rotate(45 32 32)" fill={b} />
    </>
  ),
  (a: string, b: string) => (
    <>
      <path d="M32 4 L56 18 V46 L32 60 L8 46 V18 Z" fill={a} />
      <path d="M32 20 L46 28 V44 L32 52 L18 44 V28 Z" fill={b} />
    </>
  ),
  (a: string, b: string) => (
    <>
      <circle cx="32" cy="32" r="28" fill={a} />
      <path d="M14 26 L22 40 L32 24 L42 40 L50 26 L46 46 H18 Z" fill={b} />
    </>
  ),
  (a: string, b: string) => (
    <>
      <rect x="4" y="4" width="56" height="56" rx="10" fill={a} />
      <path d="M16 20 L32 34 L48 20" stroke={b} strokeWidth={7} fill="none" strokeLinecap="round" />
      <path d="M16 38 L32 52 L48 38" stroke={b} strokeWidth={7} fill="none" strokeLinecap="round" />
    </>
  ),
  (a: string, b: string) => (
    <>
      <circle cx="32" cy="32" r="28" fill={a} />
      <path
        d="M32 10 C24 22 18 28 18 38 C18 48 25 54 32 54 C39 54 46 48 46 38 C46 30 42 26 38 20 C38 26 34 28 32 24 C30 20 32 14 32 10 Z"
        fill={b}
      />
    </>
  ),
];

export const LOGO_COUNT = SHAPES.length;

export default function TeamLogo({
  index,
  colorA,
  colorB,
  size = 26,
}: {
  index: number;
  colorA: string;
  colorB: string;
  size?: number;
}) {
  const shape = SHAPES[((index % SHAPES.length) + SHAPES.length) % SHAPES.length];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ borderRadius: "50%", flexShrink: 0 }}>
      {shape(colorA, colorB)}
    </svg>
  );
}
