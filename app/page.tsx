"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Item = {
  id: string;
  name: string;
  category: string | null;
  color: string | null;
  size: string | null;
};

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) setError(error.message);
      setItems(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: "24px auto", padding: "0 16px", fontFamily: "system-ui" }}>
      <h1>NeGiYsem – Closet</h1>
      {loading && <p>Yükleniyor...</p>}
      {error && <p style={{ color: "crimson" }}>Hata: {error}</p>}
      {!loading && items.length === 0 && <p>Henüz ürün yok.</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {items.map((it) => (
          <li
            key={it.id}
            style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, marginBottom: 8 }}
          >
            <strong>{it.name}</strong> ({it.category}, {it.color}, {it.size})
          </li>
        ))}
      </ul>

      {/* Debug için env check */}
      <p style={{ fontSize: 12, opacity: 0.6 }}>
        Env check → URL: {Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) ? "OK" : "MISSING"} •
        ANON: {Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? "OK" : "MISSING"}
      </p>
    </main>
  );
}
