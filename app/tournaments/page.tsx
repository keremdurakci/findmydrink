import Link from "next/link";
import SignInButton from "@/components/tournaments/SignInButton";

export const metadata = {
  title: "Bracket — Tournament builder",
  description:
    "Run single elimination, round robin, or groups + knockout tournaments. Set up teams with their own colors and logos, share one link, and watch scores update live.",
};

const FEATURES = [
  {
    icon: "🏆",
    title: "Any format",
    body: "Single elimination, round robin, or groups + knockout — pick what fits your event.",
  },
  {
    icon: "⚡",
    title: "Live scores",
    body: "The organizer enters a score and everyone watching sees it update instantly.",
  },
  {
    icon: "🎨",
    title: "Team colors & logos",
    body: "Every team picks its own colors and crest, so the bracket looks like it's really theirs.",
  },
  {
    icon: "🔗",
    title: "One link to share",
    body: "Send a single link — with a QR code and calendar sync — and everyone's on the same page.",
  },
];

const HOW_IT_WORKS = [
  {
    title: "Set up your tournament",
    body: "Name it, pick a format, and add your teams — takes about two minutes.",
  },
  {
    title: "Customize each team",
    body: "Give every team its own colors and crest, or auto-assign random seeding for you.",
  },
  {
    title: "Share and go",
    body: "One link for players and spectators. Enter scores as you go and the bracket updates live.",
  },
];

export default function TournamentsLandingPage() {
  return (
    <div className="t-landing">
      <div className="t-nav">
        <div className="brand">
          <div className="brand-mark">B</div>
          <div>
            <div className="brand-name">Bracket</div>
            <div className="brand-sub">Tournament builder</div>
          </div>
        </div>
        <SignInButton />
      </div>

      <div className="hero">
        <p className="hero-eyebrow">Tournament builder</p>
        <h1>Run tournaments people show up for</h1>
        <p className="subtitle">
          Single elimination, round robin, or groups + knockout — set up teams with their own colors and logos, share
          one link, and watch scores update live.
        </p>
        <div className="hero-actions">
          <Link href="/tournaments/new" className="btn btn-primary">
            Start building your tournament
          </Link>
          <a href="#how-it-works" className="btn btn-ghost">
            See how it works
          </a>
        </div>
      </div>

      <section aria-labelledby="features-title">
        <h2 id="features-title" className="section-title">
          Everything you need, nothing you don't
        </h2>
        <p className="section-hint">Built for organizers who'd rather be running the event than managing a spreadsheet.</p>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="how-title">
        <h2 id="how-title" className="section-title">
          How it works
        </h2>
        <p className="section-hint">From blank page to live bracket in a few minutes.</p>
        <div className="how-grid">
          {HOW_IT_WORKS.map((step) => (
            <div className="how-step" key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="pricing-line">
        <span className="amount">$5</span>
        <span style={{ color: "var(--muted)", fontSize: 14 }}> per tournament, or </span>
        <span className="amount">$20</span>
        <span style={{ color: "var(--muted)", fontSize: 14 }}> for a 5-pack</span>
        <p>Pay when you're ready to share — pricing details are on the setup page.</p>
      </div>

      <footer>
        <span className="brand-name">Bracket</span>
      </footer>
    </div>
  );
}
