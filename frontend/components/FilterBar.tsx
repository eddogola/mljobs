"use client";

import { FilterOptions, CityOption } from "@/lib/api";

interface Filters {
  seniority: string;
  ml_domain: string;
  remote: string;
  source: string;
  days_ago: string;
  search: string;
  skill: string;
  city: string;
}

interface Props {
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
  options: FilterOptions | null;
  cities: CityOption[];
  total: number;
}

function IconSelect({ icon, value, onChange, children }: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-2 text-gray-400 dark:text-zinc-500 pointer-events-none">
        {icon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-sm text-gray-700 dark:text-zinc-200 rounded pl-7 pr-2 py-2 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 appearance-none"
      >
        {children}
      </select>
    </div>
  );
}

export default function FilterBar({ filters, onChange, options, cities, total }: Props) {
  return (
    <div className="flex items-center gap-2 py-4 border-b border-gray-200 dark:border-zinc-800 overflow-x-auto scrollbar-none">
      {/* Search */}
      <div className="relative flex items-center">
        <span className="absolute left-3 text-gray-400 dark:text-zinc-500 pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search title or company..."
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-sm text-gray-700 dark:text-zinc-200 rounded pl-9 pr-3 py-2 w-40 sm:w-64 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 placeholder:text-gray-400 dark:placeholder:text-zinc-600"
        />
      </div>

      <div className="border-l border-gray-200 dark:border-zinc-700 h-7 mx-1" />

      {/* Domain */}
      <IconSelect
        value={filters.ml_domain}
        onChange={(v) => onChange({ ml_domain: v })}
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a8 8 0 1 0 0 16A8 8 0 0 0 12 2z"/><path d="M12 6v6l4 2"/>
          </svg>
        }
      >
        <option value="">All domains</option>
        {options?.ml_domain.map((d) => <option key={d} value={d}>{d}</option>)}
      </IconSelect>

      {/* Seniority */}
      <IconSelect
        value={filters.seniority}
        onChange={(v) => onChange({ seniority: v })}
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        }
      >
        <option value="">All levels</option>
        {options?.seniority.map((s) => <option key={s} value={s}>{s}</option>)}
      </IconSelect>

      {/* Remote */}
      <IconSelect
        value={filters.remote}
        onChange={(v) => onChange({ remote: v })}
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        }
      >
        <option value="">Any location</option>
        {options?.remote.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
      </IconSelect>

      {/* City */}
      <IconSelect
        value={filters.city}
        onChange={(v) => onChange({ city: v })}
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="22" x2="21" y2="22"/><rect x="2" y="9" width="4" height="13"/><rect x="10" y="5" width="4" height="17"/><rect x="18" y="2" width="4" height="20"/>
          </svg>
        }
      >
        <option value="">All cities</option>
        {cities.map(({ city, count }) => (
          <option key={city} value={city}>{city} ({count})</option>
        ))}
      </IconSelect>

      {/* Source */}
      <IconSelect
        value={filters.source}
        onChange={(v) => onChange({ source: v })}
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
          </svg>
        }
      >
        <option value="">All sources</option>
        {options?.source.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
      </IconSelect>

      {/* Time */}
      <IconSelect
        value={filters.days_ago}
        onChange={(v) => onChange({ days_ago: v })}
        icon={
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        }
      >
        <option value="">Any time</option>
        <option value="1">Last 24h</option>
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
      </IconSelect>

      {Object.values(filters).some(Boolean) && (
        <button
          onClick={() => onChange({ seniority: "", ml_domain: "", remote: "", source: "", days_ago: "", search: "", skill: "", city: "" })}
          className="text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 ml-1"
        >
          Clear
        </button>
      )}

      <span className="ml-auto shrink-0 text-xs text-gray-400 dark:text-zinc-500 hidden sm:block">{total.toLocaleString()} jobs</span>
    </div>
  );
}
