"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Item = {
  id: string;
  name: string;
  category: string | null;
  color: string | null;
  size: string | null;
  created_at?: string;
};

export default function Home() {
  // form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"Üst" | "Alt" | "Aksesuar" | "Ayakkabı" | "Dış Giyim">("Üst");
  const [color, setColor] = useState("Mavi");
  const [size, setSize] = useState("M");

  // liste & durumlar
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // **düzenleme modu**
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setCategory("Üst");
    setColor("Mavi");
    setSize("M");
    setEditingId(null);
  };

  async function fetchItems() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchItems();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // update modunda mı?
    if (editingId) {
      const { error } = await supabase
        .from("items")
        .update({ name, category, color, size })
        .eq("id", editingId);

      if (error) {
        setError(error.message);
        return;
      }
      await fetchItems();
      resetForm();
      return;
    }

    // değilse ekleme
    const { error } = await supabase
      .from("items")
      .insert([{ name, category, color, size }]);

    if (error) {
      setError(error.message);
      return;
    }
    await fetchItems();
    resetForm();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setName(item.name);
    setCategory((item.category as any) ?? "Üst");
    setColor(item.color ?? "Mavi");
    setSize(item.size ?? "M");
  }

  return (
    <main style={{ maxWidth: 980, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>NeGiYSem – Closet</h1>

      <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 20 }}>
        Env check → URL: {Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) ? "OK" : "MISSING"} •
        {" "}ANON: {Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? "OK" : "MISSING"}
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 12 }}>
        <input
          placeholder="İsim (örn: Mavi gömlek)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={input}
        />

        <select value={category} onChange={(e) => setCategory(e.target.value as any)} style={input}>
          <option>Üst</option>
          <option>Alt</option>
          <option>Aksesuar</option>
          <option>Ayakkabı</option>
          <option>Dış Giyim</option>
        </select>

        <select value={color} onChange={(e) => setColor(e.target.value)} style={input}>
          <option>Mavi</option>
          <option>Siyah</option>
          <option>Beyaz</option>
          <option>Kırmızı</option>
          <option>Yeşil</option>
          <option>Gri</option>
        </select>

        <input
          placeholder="Beden"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          style={input}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" style={buttonPrimary}>
            {editingId ? "Güncelle" : "Ekle"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} style={buttonGhost}>
              İptal
            </button>
          )}
        </div>
      </form>

      {error && (
        <p style={{ color: "crimson", marginTop: 10 }}>Hata: {error}</p>
      )}

      {loading ? (
        <p style={{ opacity: 0.6, marginTop: 20 }}>Yükleniyor…</p>
      ) : items.length === 0 ? (
        <p style={{ opacity: 0.6, marginTop: 20 }}>Henüz ürün yok.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
          {items.map((item) => (
            <li key={item.id} style={listItem}>
              <div>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  ({item.category ?? "—"}, {item.color ?? "—"}, {item.size ?? "—"})
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => startEdit(item)} style={buttonLink}>
                  Düzenle
                </button>
                <button onClick={() => handleDelete(item.id)} style={{ ...buttonLink, color: "crimson" }}>
                  Sil
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

/** ——— küçük stiller ——— */
const input: React.CSSProperties = {
  height: 42,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  outline: "none",
};

const buttonPrimary: React.CSSProperties = {
  height: 42,
  padding: "0 16px",
  borderRadius: 8,
  background: "black",
  color: "white",
  border: "none",
  cursor: "pointer",
};

const buttonGhost: React.CSSProperties = {
  height: 42,
  padding: "0 16px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "white",
  cursor: "pointer",
};

const listItem: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 14,
  marginBottom: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const buttonLink: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#0f62fe",
  cursor: "pointer",
  padding: 0,
  fontSize: 14,
};
