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
  const [selectedCat, setSelectedCat] = useState<(typeof CATEGORY_OPTIONS)[number]>("Hepsi");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "az" | "za">("newest");

  // düzenleme modu
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("items").select("*").order("created_at", { ascending: false });
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
      list = list.filter((i) => (i.category || "").toLowerCase() === selectedCat.toLowerCase());
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
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("images").upload(path, file, {
        upsert: false,
        contentType: file.type || "image/*",
      });
      if (!upErr) image_path = path;
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
    setName("");
    setCategory("Üst");
    setColor("Mavi");
    setSize("M");
    setFile(null);
    setOpenForm(false);
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
      prev.map((x) => (x.id === editingId ? { ...x, name, category, color, size } : x))
    );
    setEditingId(null);
    setOpenForm(false);
    setName("");
    setCategory("Üst");
    setColor("Mavi");
    setSize("M");
  }

  // sil
  async function handleDelete(id: string) {
    const target = items.find((x) => x.id === id);
    const path = target?.image_path ?? null;

    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
