"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Item = {
  id: string;
  name: string;
  category: string | null;
  color: string | null;
  size: string | null;
  created_at: string;
};

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Üst");
  const [color, setColor] = useState("Mavi");
  const [size, setSize] = useState("M");

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setItems(data as Item[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("İsim zorunlu.");
      return;
    }

    const { error } = await supabase
      .from("items")
      .insert([{ name, category, color, size }]);

    if (error) setError(error.message);
    else {
      setName("");
      await fetchItems(); // listeyi yenile
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) setError(error.message);
    else setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">NeGiYSem – Closet</h1>

      {/* Env check */}
      <p className="text-xs opacity-60 mb-4">
        Env check → URL:{" "}
        {process.env.NEXT_PUBLIC_SUPABASE_URL ? "OK" : "MISSING"} • ANON:{" "}
        {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "OK" : "MISSING"}
      </p>

      {/* Add form */}
      <form
        onSubmit={addItem}
        className="mb-8 grid grid-cols-1 sm:grid-cols-5 gap-2"
      >
        <input
          className="border rounded px-3 py-2"
          placeholder="İsim (örn: Mavi gömlek)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>Üst</option>
          <option>Alt</option>
          <option>Dış</option>
          <option>Aksesuar</option>
        </select>
        <input
          className="border rounded px-3 py-2"
          placeholder="Renk"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Beden"
          value={size}
          onChange={(e) => setSize(e.target.value)}
        />
        <button
          type="submit"
          className="bg-black text-white rounded px-3 py-2"
        >
          Ekle
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p>Yükleniyor…</p>
      ) : items.length === 0 ? (
        <p>Henüz ürün yok.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between rounded border px-4 py-3"
            >
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-sm opacity-70">
                  ({it.category ?? "-"}, {it.color ?? "-"}, {it.size ?? "-"})
                </div>
              </div>
              <button
                onClick={() => deleteItem(it.id)}
                className="text-sm text-red-600 hover:underline"
                title="Sil"
              >
                Sil
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
