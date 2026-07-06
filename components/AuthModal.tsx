"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useLocale } from "../lib/LocaleContext";

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Şifresiz giriş: Supabase kullanıcıya "magic link" içeren bir e-posta atar,
    // kullanıcı linke tıklayınca otomatik giriş yapar. Şifre yönetmek gerekmiyor.
    await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 500 }}>{t("auth.title")}</h3>
        {sent ? (
          <p style={{ fontSize: 14, color: "#5F5E5A" }}>{t("auth.checkEmail")}</p>
        ) : (
          <form onSubmit={handleSignIn}>
            <input
              className="modal-input"
              type="email"
              required
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "..." : t("auth.sendLink")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
