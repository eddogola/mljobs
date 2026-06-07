export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Unknown date";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function remoteLabel(remote: string | null): string {
  if (!remote) return "";
  return { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" }[remote] ?? remote;
}

export function sourceLabel(source: string): string {
  return { greenhouse: "Greenhouse", lever: "Lever", ashby: "Ashby", simplify: "Simplify" }[source] ?? source;
}

export const DOMAIN_COLORS: Record<string, string> = {
  LLMs:               "bg-violet-50 text-violet-700 border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700",
  "Computer Vision":  "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700",
  RL:                 "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700",
  MLOps:              "bg-green-50 text-green-700 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700",
  "Data Platform":    "bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-700",
  "General ML":       "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600",
  "AI Infrastructure":"bg-red-50 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
  NLP:                "bg-amber-50 text-amber-700 border-amber-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700",
  Multimodal:         "bg-pink-50 text-pink-700 border-pink-300 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-700",
  "AI Safety":        "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700",
};

export const SENIORITY_COLORS: Record<string, string> = {
  Entry:     "text-green-600 dark:text-green-400",
  Mid:       "text-blue-600 dark:text-blue-400",
  Senior:    "text-amber-600 dark:text-yellow-400",
  Staff:     "text-orange-600 dark:text-orange-400",
  Principal: "text-red-600 dark:text-red-400",
  Research:  "text-purple-600 dark:text-purple-400",
};
