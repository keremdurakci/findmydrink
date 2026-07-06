import { COMMON_COLORS } from "@/lib/tournamentConstants";
import TeamLogo, { LOGO_COUNT } from "./TeamLogo";

export type TeamMeta = {
  colorA: string;
  colorB: string;
  logoType: "preset" | "upload";
  logoIndex: number;
  logoData: string | null;
};

export default function TeamCustomizer({
  meta,
  onChange,
  onDone,
}: {
  meta: TeamMeta;
  onChange: (meta: TeamMeta) => void;
  onDone: () => void;
}) {
  return (
    <div className="team-panel">
      <div className="swatch-label">Primary color</div>
      <div className="swatch-grid">
        {COMMON_COLORS.map((c) => (
          <div
            key={`a-${c}`}
            className={`swatch ${c.toLowerCase() === meta.colorA.toLowerCase() ? "sel" : ""}`}
            style={{ background: c }}
            title={c}
            onClick={() => onChange({ ...meta, colorA: c })}
          />
        ))}
      </div>
      <div className="swatch-label">Secondary color</div>
      <div className="swatch-grid">
        {COMMON_COLORS.map((c) => (
          <div
            key={`b-${c}`}
            className={`swatch ${c.toLowerCase() === meta.colorB.toLowerCase() ? "sel" : ""}`}
            style={{ background: c }}
            title={c}
            onClick={() => onChange({ ...meta, colorB: c })}
          />
        ))}
      </div>
      <div className="swatch-label">Icon</div>
      <div className="logo-grid">
        {Array.from({ length: LOGO_COUNT }).map((_, i) => (
          <div
            key={i}
            className={`logo-opt ${meta.logoType === "preset" && meta.logoIndex === i ? "sel" : ""}`}
            onClick={() => onChange({ ...meta, logoType: "preset", logoIndex: i, logoData: null })}
          >
            <TeamLogo index={i} colorA={meta.colorA} colorB={meta.colorB} size={30} />
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-block" style={{ marginTop: 12 }} onClick={onDone}>
        Done
      </button>
    </div>
  );
}
