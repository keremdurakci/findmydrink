"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useLocale } from "../lib/LocaleContext";
import { SUPPORTED_LOCALES, Locale } from "../lib/translations";
import AuthModal from "./AuthModal";

export default function Header({ session }: { session: any }) {
  const { locale, setLocale, t } = useLocale();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="header">
      <Link href="/" className="logo" style={{ textDecoration: "none" }}>
        findmydrink
      </Link>
      <div className="nav-links">
        <span className="nav-link">{t("nav.whisky")}</span>
        <span className="nav-link">{t("nav.wine")}</span>
        <span className="nav-link">{t("nav.worldSpirits")}</span>

        <select
          className="locale-select"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
        >
          {SUPPORTED_LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>

        {session ? (
          <>
            <Link href="/dashboard" className="nav-link">
              {t("nav.dashboard")}
            </Link>
            <button className="btn-primary" onClick={() => supabase.auth.signOut()}>
              {t("nav.signOut")}
            </button>
          </>
        ) : (
          <button className="btn-primary" onClick={() => setShowAuth(true)}>
            {t("nav.signIn")}
          </button>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
