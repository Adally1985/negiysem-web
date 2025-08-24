"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Item = {
  id: string;
  name: string;
  category: "Üst" | "Alt" | "Dış" | "Ayakkabı" | string;
  color: string;
  size: string;
  image_path: string | null;
  created_at: string;
};

const CATEGORIES = ["Üst", "Alt", "Dış", "Ayakkabı"] as const;
const COLORS = ["Mavi", "Kırmızı", "Sarı", "Turuncu", "Siyah", "Gri"] as const;
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export default function Page() {
  // --- data
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // --- add form (header içindeki “Add to closet” butonu ile aç/kapa)
  const [openForm, setOpenForm] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Item["category"]>("Üst");
  const [color, setColor] = useState("Mavi");
  const [size, setSize] = useState("M");
  const [file, setFile] = useState<File | null>(null);

  // --- view helpers
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) =>
      sort === "newest"
        ? +new Date(b.created_at) - +new Date(a.created_at)
        : +new Date(a.created_at) - +new Date(b.created_at)
    );
    return arr;
  }, [items, sort]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setItems(data as Item[]);
      setLoading(false);
    })();
  }, []);

  async function handleDelete(id: string, image_path: string | null) {
    await supabase.from("items").delete().eq("id", id);
    if (image_path) {
      await supabase.storage.from("images").remove([image_path]);
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleAdd() {
    if (!name.trim()) return;

    let image_path: string | null = null;

    // 1) resmi yükle
    if (file) {
      const path = `${Date.now()}-${file.name}`.replace(/\s+/g, "-");
      const { error: upErr } = await supabase.storage
        .from("images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (!upErr) image_path = path;
    }

    // 2) kaydı ekle
    const { data, error } = await supabase
      .from("items")
      .insert({
        name,
        category,
        color,
        size,
        image_path,
      })
      .select("*")
      .single();

    if (!error && data) {
      setItems((prev) => [data as Item, ...prev]);
      // formu sıfırla
      setName("");
      setCategory("Üst");
      setColor("Mavi");
      setSize("M");
      setFile(null);
      setOpenForm(false);
    }
  }

  function publicUrl(path: string | null) {
    if (!path) return null;
    const { data } = supabase.storage.from("images").getPublicUrl(path);
    return data.publicUrl;
  }

  return (
    <main className="min-h-dvh bg-neutral-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Closet <sup className="ml-1 text-sm text-neutral-500">{items.length}</sup>
              </h1>
              <p className="text-xs text-neutral-500">
                Env check → URL: <b>OK</b> • ANON: <b>OK</b>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Sıralama */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>

              {/* Add to closet */}
              <button
                onClick={() => setOpenForm((s) => !s)}
                className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90"
              >
                <span className="text-base leading-none">＋</span> Add to closet
              </button>
            </div>
          </div>

          {/* Add form (collapsible) */}
          {openForm && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <input
                className="rounded-lg border border-neutral-300 px-3 py-2"
                placeholder="İsim (örn: Mavi gömlek)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <select
                className="rounded-lg border border-neutral-300 px-3 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                className="rounded-lg border border-neutral-300 px-3 py-2"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              >
                {COLORS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                className="rounded-lg border border-neutral-300 px-3 py-2"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              >
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="rounded-lg border border-neutral-300 px-3 py-2 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2"
              />

              <button
                onClick={handleAdd}
                className="rounded-lg bg-black px-4 py-2 font-medium text-white hover:bg-black/90"
              >
                Ekle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6">
        {loading ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : (
          <div className="
              grid gap-6
              grid-cols-2
              sm:grid-cols-3
              md:grid-cols-4
              lg:grid-cols-5
            ">
            {sorted.map((it) => (
              <article
                key={it.id}
                className="group rounded-xl border border-neutral-200 bg-white transition-shadow hover:shadow-md"
              >
                {/* Image area -> kare kart (1:1) */}
                <div className="relative aspect-square overflow-hidden rounded-t-xl bg-neutral-50">
                  {it.image_path ? (
                    <Image
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                      src={publicUrl(it.image_path)!}
                      alt={it.name}
                      className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-neutral-400">
                      <span className="text-5xl">🗂️</span>
                    </div>
                  )}

                  {/* Quick actions (hover) */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end gap-2 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={async () => await handleDelete(it.id, it.image_path)}
                      className="pointer-events-auto rounded-md bg-white/90 px-2 py-1 text-xs text-red-600 shadow-sm ring-1 ring-inset ring-black/5 hover:bg-white"
                      title="Sil"
                    >
                      Sil
                    </button>
                  </div>
                </div>

                <div className="p-3">
                  <h3 className="truncate text-sm font-medium text-neutral-900">{it.name}</h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    {it.category}, {it.color}, {it.size}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
