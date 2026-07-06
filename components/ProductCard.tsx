"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useLocale } from "../lib/LocaleContext";
import AuthModal from "./AuthModal";

type Product = {
  id: number;
  name: string;
  category: string;
  current_price: number;
  in_stock: boolean;
  image_url?: string;
};

export default function ProductCard({
  product,
  session,
  isFavorited,
}: {
  product: Product;
  session: any;
  isFavorited: boolean;
}) {
  const { t } = useLocale();
  const [favorited, setFavorited] = useState(isFavorited);
  const [showAuth, setShowAuth] = useState(false);

  async function handleHeartClick() {
    // Giriş yapmamışsa favori eklemeye çalıştığı anda giriş penceresi açılır -
    // gezinmek için giriş şart değil, sadece takip etmek isteyince istenir.
    if (!session) {
      setShowAuth(true);
      return;
    }
    if (favorited) {
      await supabase.from("favorites").delete().eq("user_id", session.user.id).eq("product_id", product.id);
      setFavorited(false);
    } else {
      await supabase.from("favorites").insert({ user_id: session.user.id, product_id: product.id });
      setFavorited(true);
    }
  }

  return (
    <div className="product-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p className="product-name">{product.name}</p>
        <button
          className={`heart-btn ${favorited ? "active" : ""}`}
          onClick={handleHeartClick}
          aria-label={t("product.addFavorite")}
        >
          {favorited ? "♥" : "♡"}
        </button>
      </div>
      <p className="product-meta">{product.category}</p>
      <p className="product-price">${product.current_price.toFixed(2)}</p>
      <span className={`badge ${product.in_stock ? "badge-instock" : "badge-outofstock"}`}>
        {product.in_stock ? t("product.inStock") : t("product.outOfStock")}
      </span>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
