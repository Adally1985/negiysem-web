"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Filters } from "../types/filters";

/** ---- Item tipi ---- */
type Item = {
  id: string;
  name: string;
  category: string | null;
  color: string | null;
  size: string | null;
  image_path?: string | null;
  created_at?: string | null;
};

/** ---- Filtre seçenekleri ---- */
const CATEGORY_OPTIONS = ["Üst", "Alt", "Elbise", "Ayakkabı", "Dış Giyim", "Aksesuar"] as const;
const COLOR_OPTIONS = ["Mavi", "Siyah", "Beyaz", "Kırmızı", "Sarı", "Turuncu", "Bej", "Gri"] as const;
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export default function Home() {
  /** Liste durumu */
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  /** Filtre modeli (types/filters.ts) */
  const [filters, setFilters] = useState<Filters>({
    q: "",
    category: [],
    color: [],
    fit: [], // şu an kullanılmıyor ama modelde dursun
    sort: "newest",
  });

  /** Ekran açılışında veriyi çek */
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) setErr(error.message);
      setItems((data as Item[]) || []);
      setLoading(false);
    })();
  }, []);

  /** Storage public URL */
  function publicUrlOf(path?: string | null) {
    if (!path) return null;
    return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
  }

  /** Filtreleme + sıralama (client-side) */
  const filtered = useMemo(() => {
    let list = [...items];

    // Arama
    if (filters.q && filters.q.trim()) {
      const q = filters.q.trim().toLowerCase();
      list = list.filter((i) => (i.name || "").toLowerCase().includes(q));
    }

    // Kategori
    if (filters.category && filters.category.length > 0) {
      const setCat = new Set(filters.category.map((c) => c.toLowerCase()));
      list = list.filter((i) => (i.category ? setCat.has(i.category.toLowerCase()) : false));
    }

    // Renk
    if (filters.color && filters.color.length > 0) {
      const setColor = new Set(filters.color.map((c) => c.toLowerCase()));
      list = list.filter((i) => (i.color ? setColor.has(i.color.toLowerCase()) : false));
    }

    // Beden (fit yerine size kullanalım)
    if (filters.fit && filters.fit.length > 0) {
      const setSize = new Set(filters.fit.map((s) => s.toUpperCase()));
      list = list.filter((i) => (i.size ? setSize.has(i.size.toUpperCase()) : false));
    }

    // Sıralama
    switch (filters.sort) {
      case "oldest":
        list.sort((a, b) => (a.created_at || "") > (b.created_at || "") ? 1 : -1);
        break;
      case "az":
        list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"));
        break;
      case "za":
        list.sort((a, b) => (b.name || "").localeCompare(a.name || "", "tr"));
        break;
      default:
        // newest
        list.sort((a, b) => (a.created_at || "") < (b.created_at || "") ? 1 : -1);
        break;
    }

    return list;
  }, [items, filters]);

  /** Yardımcılar */
  const toggleInArray = (key: keyof Filters, value: string) => {
    setFilters((prev) => {
      const arr = new Set([...(prev[key] as string[] | undefined || [])]);
      if (arr.has(value)) arr.delete(value);
      else arr.add(value);
      return { ...prev, [key]: Array.from(arr) };
    });
  };

  const clearFilters = () =>
    setFilters({ q: "", category: [], color: [], fit: [], sort: "newest" });

  /** Basit UI */
  return (
    <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginRight: "auto" }}>
          Closet <sup>{filtered.length}</sup>
        </h1>

        {/* Sıralama */}
        <select
          value={filters.sort || "newest"}
          onChange={(e) => setFilters((p) => ({ ...p, sort: e.target.value as Filters["sort"] }))}
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          <option value="newest">En yeni</option>
          <option value="oldest">En eski</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
        </select>

        {/* Arama */}
        <input
          value={filters.q || ""}
          onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
          placeholder="Ara (örn: mavi gömlek)"
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            minWidth: 240,
          }}
        />

        <button
          onClick={clearFilters}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #eee",
            background: "#fafafa",
            cursor: "pointer",
          }}
        >
          Filtreleri temizle
        </button>
      </header>

      {/* Kategori – çoklu seçim chip’ler */}
      <section style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Kategori</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CATEGORY_OPTIONS.map((cat) => {
            const active = filters.category?.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleInArray("category", cat)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid " + (active ? "#5b9cff" : "#e3e3e3"),
                  background: active ? "#eaf2ff" : "#fff",
                  color: active ? "#2b66d9" : "#333",
                  cursor: "pointer",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Renk – çoklu seçim chip’ler */}
      <section style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Renk</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {COLOR_OPTIONS.map((c) => {
            const active = filters.color?.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleInArray("color", c)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid " + (active ? "#5b9cff" : "#e3e3e3"),
                  background: active ? "#eaf2ff" : "#fff",
                  color: active ? "#2b66d9" : "#333",
                  cursor: "pointer",
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      {/* Beden – çoklu seçim chip’ler */}
      <section style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Beden</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SIZE_OPTIONS.map((s) => {
            const active = filters.fit?.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleInArray("fit", s)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid " + (active ? "#5b9cff" : "#e3e3e3"),
                  background: active ? "#eaf2ff" : "#fff",
                  color: active ? "#2b66d9" : "#333",
                  cursor: "pointer",
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      </section>

      {/* İçerik */}
      <main style={{ marginTop: 24 }}>
        {loading ? (
          <div>Yükleniyor…</div>
        ) : err ? (
          <div style={{ color: "crimson" }}>{err}</div>
        ) : filtered.length === 0 ? (
          <div>Sonuç bulunamadı.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {filtered.map((it) => {
              const url = publicUrlOf(it.image_path || undefined);
              return (
                <article
                  key={it.id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1/1",
                      background: "#f7f7f7",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={it.name || "item"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#999",
                          padding: 12,
                          textAlign: "center",
                        }}
                      >
                        Fotoğraf yok
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 600 }}>{it.name}</div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                      {(it.category || "—")}, {(it.color || "—")}, {(it.size || "—")}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
