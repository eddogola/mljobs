const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface JobListItem {
  id: string;
  source: string;
  url: string;
  title: string;
  company: string;
  location: string | null;
  remote: string | null;
  posted_at: string | null;
  parse_status: string;
  seniority: string | null;
  ml_domain: string | null;
}

export interface TechStack {
  frameworks: string[];
  infra: string[];
  languages: string[];
  tools: string[];
}

export interface JobAnalysis {
  job_id: string;
  role_summary: string | null;
  seniority: string | null;
  ml_domain: string | null;
  must_have_technical: string[];
  must_have_non_technical: string[];
  nice_to_have_technical: string[];
  tech_stack: TechStack | null;
  team_name: string | null;
  hiring_manager: string | null;
  domain_knowledge: string[];
  interview_topics: string[];
  experience_signals: string[];
  red_flags: string[];
  parsed_at: string | null;
}

export interface Job {
  id: string;
  source: string;
  url: string;
  title: string;
  company: string;
  location: string | null;
  remote: string | null;
  posted_at: string | null;
  parse_status: string;
  description: string;
  analysis: JobAnalysis | null;
}

export interface JobsResponse {
  total: number;
  page: number;
  page_size: number;
  jobs: JobListItem[];
}

export interface FilterOptions {
  seniority: string[];
  ml_domain: string[];
  remote: string[];
  source: string[];
}

export async function fetchJobs(params: Record<string, string | number | undefined>): Promise<JobsResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "" && v !== null) qs.set(k, String(v));
  }
  const res = await fetch(`${BASE}/api/jobs/?${qs}`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

export async function fetchJob(id: string): Promise<Job> {
  const res = await fetch(`${BASE}/api/jobs/${id}`);
  if (!res.ok) throw new Error("Job not found");
  return res.json();
}

export async function fetchFilterOptions(): Promise<FilterOptions> {
  const res = await fetch(`${BASE}/api/jobs/filters`);
  if (!res.ok) throw new Error("Failed to fetch filters");
  return res.json();
}

export interface CityOption {
  city: string;
  count: number;
}

export async function fetchCities(): Promise<CityOption[]> {
  const res = await fetch(`${BASE}/api/jobs/cities`);
  if (!res.ok) throw new Error("Failed to fetch cities");
  return res.json();
}
