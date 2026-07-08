"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SignInButton() {
  const [session, setSession] = useState<any>(undefined);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href },
      });
      if (otpError) throw otpError;
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Could not send the sign-in link. Please try again.");
    }
  }

  if (session) return null;

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        Sign in
      </button>
      {open && (
        <div className="t-modal-overlay" onClick={() => setOpen(false)}>
          <div className="t-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 800 }}>Sign in</h3>
            <p className="hint" style={{ margin: "0 0 16px" }}>
              We'll email you a sign-in link — no password needed.
            </p>
            {sent ? (
              <p style={{ color: "var(--green-light)", fontSize: 14 }}>Check your email for a sign-in link.</p>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && <p className="error-text">{error}</p>}
                <input
                  type="text"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
                <button className="btn btn-primary btn-block" type="submit">
                  Send sign-in link
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
