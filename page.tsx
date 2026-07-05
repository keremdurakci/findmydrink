"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";

export default function HomePage() {
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);

  useEffect(() => {
    // Oturum durumu - giriş yapılmışsa favori kalp ikonları dolu görünecek
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Ürünler HERKESE AÇIK - giriş yapılmadan da görünür (SEO ve gezinme için önemli)
    supabase
      .from("products")
      .select("id, name, category, current_price, in_stock, image_url")
      .order("last_checked", { ascending: false })
      .limit(50)
      .then(({ data }) => setProducts(data || []));
  }, []);

  useEffect(() => {
    if (!session) {
      setFavoriteIds([]);
      return;
    }
    supabase
      .from("favorites")
      .select("product_id")
      .eq("user_id", session.user.id)
      .then(({ data }) => setFavoriteIds((data || []).map((f) => f.product_id)));
  }, [session]);

  return (
    <div className="container">
      <Header session={session} />
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} session={session} isFavorited={favoriteIds.includes(p.id)} />
        ))}
      </div>
      {products.length === 0 && (
        <p style={{ color: "#888780", fontSize: 14 }}>
          No products yet — the scraper hasn&apos;t run, or hasn&apos;t found anything yet.
        </p>
      )}
    </div>
  );
}
