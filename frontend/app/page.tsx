"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import FilterBar from "@/components/FilterBar";
import JobCard from "@/components/JobCard";
import SkillsLandscape from "@/components/SkillsLandscape";
import ThemeToggle from "@/components/ThemeToggle";
import SavedPanel from "@/components/SavedPanel";
import { fetchJobs, fetchFilterOptions, fetchCities, JobListItem } from "@/lib/api";

type Filters = {
  seniority: string;
  ml_domain: string;
  remote: string;
  source: string;
  days_ago: string;
  search: string;
  skill: string;
  city: string;
};

const FILTER_KEYS: (keyof Filters)[] = [
  "seniority", "ml_domain", "remote", "source", "days_ago", "search", "skill", "city",
];

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL is the source of truth for all filter state
  const filters: Filters = {
    seniority: searchParams.get("seniority") ?? "",
    ml_domain: searchParams.get("ml_domain") ?? "",
    remote:    searchParams.get("remote") ?? "",
    source:    searchParams.get("source") ?? "",
    days_ago:  searchParams.get("days_ago") ?? "",
    search:    searchParams.get("search") ?? "",
    skill:     searchParams.get("skill") ?? "",
    city:      searchParams.get("city") ?? "",
  };
  const page = parseInt(searchParams.get("page") ?? "1", 10);

  const updateParams = useCallback((updates: Partial<Filters> & { page?: number }) => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) p.set(key, String(value));
      else p.delete(key);
    }
    router.replace(`/?${p.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const onChange = useCallback((partial: Partial<Filters>) => {
    const p = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(partial)) {
      if (value) p.set(key, String(value));
      else p.delete(key);
    }
    p.delete("page"); // reset to page 1 on any filter change
    router.replace(`/?${p.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const onSkillClick = useCallback((skill: string) => {
    onChange({ skill });
  }, [onChange]);

  const setPage = useCallback((newPage: number) => {
    updateParams({ page: newPage === 1 ? 0 : newPage });
  }, [updateParams]);

  const { data: options } = useSWR("filters", fetchFilterOptions);
  const { data: cities } = useSWR("cities", fetchCities);

  const queryKey = JSON.stringify({ ...filters, page });
  const { data, isLoading, error } = useSWR(queryKey, () =>
    fetchJobs({ ...filters, page, page_size: 20 })
  );

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  const [showMobileLandscape, setShowMobileLandscape] = useState(false);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-4 lg:py-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-lg lg:text-xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight hover:opacity-75 transition-opacity">JobLens</Link>
          <p className="text-xs lg:text-sm text-gray-500 dark:text-zinc-500 mt-0.5 hidden sm:block">ML/AI engineering jobs · click any skill to filter</p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/prep"
            className="text-xs font-medium px-2.5 py-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Interview Prep
          </Link>
          {/* Mobile: skills landscape toggle */}
          <button
            onClick={() => setShowMobileLandscape((v: boolean) => !v)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors relative"
            aria-label="Skills landscape"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            {filters.skill && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-rose-500" />}
          </button>
          <SavedPanel />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile skills landscape panel */}
      {showMobileLandscape && (
        <div className="lg:hidden mb-4 border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          <SkillsLandscape activeSkill={filters.skill} onSkillClick={(s) => { onSkillClick(s); setShowMobileLandscape(false); }} />
        </div>
      )}

      <div className="flex gap-6 items-start">
        {/* Main */}
        <div className="flex-1 min-w-0">
          <FilterBar
            filters={filters}
            onChange={onChange}
            options={options ?? null}
            cities={cities ?? []}
            total={data?.total ?? 0}
          />

          <div className="mt-2">
            {isLoading && (
              <div className="text-center py-16 text-gray-400 dark:text-zinc-600 text-sm">Loading jobs...</div>
            )}
            {error && (
              <div className="text-center py-16 text-red-500 text-sm">
                Could not connect to backend. Make sure the API is running on :8000.
              </div>
            )}
            {!isLoading && !error && data?.jobs.length === 0 && (
              <div className="text-center py-16 text-gray-400 dark:text-zinc-600 text-sm">No jobs match these filters.</div>
            )}
            {data?.jobs.map((job: JobListItem) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8 pb-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="text-sm text-gray-400 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-400 dark:text-zinc-500">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="text-sm text-gray-400 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Sidebar — hidden on mobile */}
        <aside className="hidden lg:block w-72 shrink-0 sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto">
          <SkillsLandscape activeSkill={filters.skill} onSkillClick={onSkillClick} />
        </aside>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
