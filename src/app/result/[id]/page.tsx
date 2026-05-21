"use client";

import { use } from "react";
import Link from "next/link";

export default function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Plan Generated
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Your Financial Life Plan is ready to download.
          </p>
        </div>

        <div className="space-y-3">
          <a
            href={`/api/download/${id}/docx`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent text-foreground py-2.5 text-sm font-semibold hover:brightness-105 transition"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Download .docx
          </a>
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="text-sm text-foreground/60 hover:text-foreground transition-colors"
          >
            Generate another plan
          </Link>
        </div>
      </div>
    </main>
  );
}
