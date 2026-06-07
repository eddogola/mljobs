import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "JobLens — ML/AI Jobs",
  description: "Aggregated ML/AI engineering jobs with interview prep breakdowns",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
