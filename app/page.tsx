"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Item = {
  id: string;
  name: string;
  category: string | null;
  color: string | null;
  size: string | null;
  image_path?: string | null;
  created_at?: string;
};

const CATEGORY_OPTIONS = ["Hepsi", "Üst", "Alt", "Elbise", "Ayakkabı", "Dış Giyim", "Aksesuar"] as const;

export default function Home() {
  // liste
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ekleme/düzenleme formu
  const [openForm, setOpenForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("Üst");
  const [color, setColor] = useState("Mavi");
  const [size, setSize] = useState("M");
  const [file, setFile] = useState<File | null>(null);

  // filtreler (MVP)
  const [selectedCat, setSelectedCat] =
    useState<(typeof CATEGORY_OPTIONS)[number]>("Hepsi");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "az" | "za">("newest");

  // düzenleme modu
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      setItems(data || []);
      setLoading(false);
    })();
  }, []);

  // public URL üretici (image_path = storage path)
  function publicUrlOf(path?: string | null) {
    if (!path) return null;
    return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
  }

  // client-side filtre + sıralama
  const filtered = useMemo(() => {
    let list = [...items];

    if (selectedCat !== "Hepsi") {
      list = list.filter(
        (i) => (i.category || "").toLowerCase() === selectedCat.toLowerCase()
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => (i.name || "").toLowerCase().includes(q));
    }

    switch (sort) {
      case "oldest":
        list.sort((a, b) => (a.created_at! > b.created_at! ? 1 : -1));
        break;
      case "az":
        list.sort((a, b) => (a.name || "").localeCompare(b.name || "", "tr"));
        break;
      case "za":
        list.sort((a, b) => (b.name || "").localeCompare(a.name || "", "tr"));
        break;
      default:
        // newest
        list.sort((a, b) => (a.created_at! < b.created_at! ? 1 : -1));
    }

    return list;
  }, [items, selectedCat, search, sort]);

  // kayıt ekleme
  async function handleAdd() {
    if (!name.trim()) return;

    let image_path: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("images")
        .upload(path, file, {
          upsert: false,
          contentType: file.type || "image/*",
        });
      if (!upErr) image_path = path;
      else {
        setError(upErr.message);
        return;
      }
    }

    const { data, error } = await supabase
      .from("items")
      .insert([{ name, category, color, size, image_path }])
      .select("*")
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setItems((prev) => (data ? [data as Item, ...prev] : prev));
    resetForm();
  }

  // düzenleme başlat
  function startEdit(it: Item) {
    setEditingId(it.id);
    setName(it.name || "");
    setCategory(it.category || "Üst");
    setColor(it.color || "Mavi");
    setSize(it.size || "M");
    setOpenForm(true);
  }

  // güncelle
  async function handleUpdate() {
    if (!editingId) return;
    const { error } = await supabase
      .from("items")
      .update({ name, category, color, size })
      .eq("id", editingId);
    if (error) {
      setError(error.message);
      return;
    }
    // local state güncelle
    setItems((prev) =>
      prev.map((x) =>
        x.id === editingId ? { ...x, name, category, color, size } : x
      )
    );
    setEditingId(null);
    resetForm();
  }

  // sil (tamamlandı)
  async function handleDelete(id: string) {
    const target = items.find((x) => x.id === id);
    const path = target?.image_path ?? null;

    // önce DB kaydını sil
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }

    // storage'dan görseli de sil (varsa)
    if (path) {
      await supabase.storage.from("images").remove([path]);
    }

    // state güncelle
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function resetForm() {
    setName("");
    setCategory("Üst");
    setColor("Mavi");
    setSize("M");
    setFile(null);
    setOpenForm(false);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* Üst bar */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">NeGiYSem – Closet</h1>
          <span className="text-sm text-neutral-500">({items.length})</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="h-10 rounded-md border px-3 text-sm"
            value={selectedCat}
            onChange={(e) =>
              setSelectedCat(e.target.value as (typeof CATEGORY_OPTIONS)[number])
            }
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <input
            className="h-10 w-full rounded-md border px-3 text-sm"
            placeholder="İsimde ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <select
            className="h-10 rounded-md border px-3 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
          >
            <option value="newest">En Yeni</option>
            <option value="oldest">En Eski</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>

          <button
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
            onClick={() => setOpenForm((s) => !s)}
          >
            {openForm ? "Formu Kapat" : "Gardıroba Ekle"}
          </button>
        </div>
      </div>

      {/* Form */}
      {openForm && (
        <div className="mb-6 grid grid-cols-1 gap-2 sm:grid-cols-5">
          <input
            className="rounded-md border px-3 py-2"
            placeholder="İsim (örn: Mavi gömlek)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="rounded-md border px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Üst</option>
            <option>Alt</option>
            <option>Elbise</option>
            <option>Ayakkabı</option>
            <option>Dış Giyim</option>
            <option>Aksesuar</option>
          </select>
          <input
            className="rounded-md border px-3 py-2"
            placeholder="Renk"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <input
            className="rounded-md border px-3 py-2"
            placeholder="Beden"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded-md border px-3 py-2 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2"
          />

          <div className="col-span-full flex gap-2">
            {editingId ? (
              <>
                <button
                  onClick={handleUpdate}
                  className="rounded-md bg-black px-4 py-2 text-white"
                >
                  Güncelle
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    resetForm();
                  }}
                  className="rounded-md border px-4 py-2"
                >
                  İptal
                </button>
              </>
            ) : (
              <button
                onClick={handleAdd}
                className="rounded-md bg-black px-4 py-2 text-white"
              >
                Ekle
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <p>Yükleniyor…</p>
      ) : filtered.length === 0 ? (
        <p>Kayıt bulunamadı.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((it) => {
            const img = publicUrlOf(it.image_path);
            return (
              <li
                key={it.id}
                className="overflow-hidden rounded-xl border bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-[3/4] bg-neutral-50">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={it.name}
                      className="h-full w-full object-contain p-3"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-4xl text-neutral-400">
                      👕
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between p-3">
                  <div>
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-neutral-500">
                      {it.category ?? "—"} • {it.color ?? "—"} • {it.size ?? "—"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(it)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(it.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
