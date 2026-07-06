export const SPORTS = ["Soccer", "Basketball", "Volleyball", "Tennis", "Chess", "Other"];

export const COMMON_COLORS = [
  "#E4402A", "#F2A93B", "#F5D547", "#8FC93A", "#2FA84F", "#1EA692", "#2E86DE", "#1B4F91",
  "#5B4FCF", "#8E44AD", "#D6479A", "#E85D75", "#8B5E3C", "#5B4636", "#2C2C2C", "#6B6B6B",
  "#B0B0B0", "#FFFFFF", "#0D2B45", "#7A1F2B",
];

export function defaultTeamColors(index: number) {
  return {
    colorA: COMMON_COLORS[(index * 2) % COMMON_COLORS.length],
    colorB: COMMON_COLORS[(index * 2 + 7) % COMMON_COLORS.length],
  };
}
