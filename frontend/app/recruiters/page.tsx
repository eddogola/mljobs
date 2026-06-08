"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Recruiter {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  linkedin_url: string | null;
  notes: string | null;
  tags: string[];
  last_contacted: string | null;
  created_at: string;
}

const EMPTY = { name: "", company: "", email: "", linkedin_url: "", notes: "", tags: "" };

export default function RecruitersPage() {
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const r = await fetch(`${BASE}/api/recruiters`);
    if (r.ok) setRecruiters(await r.json());
  }

  useEffect(() => { load(); }, []);

  function startEdit(r: Recruiter) {
    setForm({
      name: r.name,
      company: r.company ?? "",
      email: r.email ?? "",
      linkedin_url: r.linkedin_url ?? "",
      notes: r.notes ?? "",
      tags: (r.tags ?? []).join(", "),
    });
    setEditId(r.id);
    setShowForm(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      company: form.company || null,
      email: form.email || null,
      linkedin_url: form.linkedin_url || null,
      notes: form.notes || null,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };
    if (editId) {
      await fetch(`${BASE}/api/recruiters/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`${BASE}/api/recruiters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setForm(EMPTY);
    setEditId(null);
    setShowForm(false);
    load();
  }

  async function markContacted(id: string) {
    await fetch(`${BASE}/api/recruiters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ last_contacted: new Date().toISOString() }),
    });
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this contact?")) return;
    await fetch(`${BASE}/api/recruiters/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-300">
          ← Back
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Recruiter Contacts</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">ML/AI recruiters and hiring managers you want to stay in touch with.</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(true); }}
          className="text-sm bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded hover:bg-gray-700 dark:hover:bg-zinc-300 transition-colors"
        >
          + Add contact
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="border border-gray-200 dark:border-zinc-700 rounded-lg p-5 mb-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">{editId ? "Edit contact" : "New contact"}</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["name", "Name *"],
              ["company", "Company"],
              ["email", "Email"],
              ["linkedin_url", "LinkedIn URL"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 dark:text-zinc-400 block mb-1">{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required={key === "name"}
                  className="w-full text-sm border border-gray-200 dark:border-zinc-700 rounded px-3 py-1.5 bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-200"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 block mb-1">Tags (comma-separated)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="e.g. ML engineer, startup, Bay Area"
              className="w-full text-sm border border-gray-200 dark:border-zinc-700 rounded px-3 py-1.5 bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-200"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-zinc-400 block mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full text-sm border border-gray-200 dark:border-zinc-700 rounded px-3 py-1.5 bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm px-3 py-1.5 text-gray-500 dark:text-zinc-400 hover:text-gray-700">Cancel</button>
            <button type="submit" className="text-sm bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-1.5 rounded">Save</button>
          </div>
        </form>
      )}

      {recruiters.length === 0 ? (
        <div className="text-sm text-gray-400 dark:text-zinc-600 py-12 text-center">No contacts yet — add your first recruiter above.</div>
      ) : (
        <div className="space-y-3">
          {recruiters.map((r) => (
            <div key={r.id} className="border border-gray-200 dark:border-zinc-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-zinc-100 text-sm">{r.name}</p>
                  {r.company && <p className="text-xs text-gray-500 dark:text-zinc-400">{r.company}</p>}
                  <div className="flex flex-wrap gap-3 mt-2">
                    {r.email && (
                      <a href={`mailto:${r.email}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">{r.email}</a>
                    )}
                    {r.linkedin_url && (
                      <a href={r.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">LinkedIn</a>
                    )}
                  </div>
                  {r.tags && r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.tags.map((t) => (
                        <span key={t} className="text-xs bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                  {r.notes && <p className="text-xs text-gray-500 dark:text-zinc-500 mt-2 italic">{r.notes}</p>}
                  {r.last_contacted && (
                    <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">
                      Last contacted: {new Date(r.last_contacted).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => markContacted(r.id)} className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 border border-gray-200 dark:border-zinc-700 px-2 py-1 rounded">
                    Contacted
                  </button>
                  <button onClick={() => startEdit(r)} className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 border border-gray-200 dark:border-zinc-700 px-2 py-1 rounded">
                    Edit
                  </button>
                  <button onClick={() => del(r.id)} className="text-xs text-rose-500 dark:text-rose-400 hover:text-rose-700 border border-rose-200 dark:border-rose-900 px-2 py-1 rounded">
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
