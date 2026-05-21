"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [client1FirstName, setClient1FirstName] = useState("");
  const [client1LastName, setClient1LastName] = useState("");
  const [client2FirstName, setClient2FirstName] = useState("");
  const [client2LastName, setClient2LastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client1FirstName,
          client1LastName,
          client2FirstName: client2FirstName || undefined,
          client2LastName: client2LastName || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const { id } = await res.json();
      router.push(`/result/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Financial Life Plan
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Generate a personalized FFLP document
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground mb-1">
              Client 1
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="c1first"
                  className="block text-xs font-medium text-foreground/70 mb-1"
                >
                  First Name
                </label>
                <input
                  id="c1first"
                  type="text"
                  required
                  value={client1FirstName}
                  onChange={(e) => setClient1FirstName(e.target.value)}
                  className="w-full rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label
                  htmlFor="c1last"
                  className="block text-xs font-medium text-foreground/70 mb-1"
                >
                  Last Name
                </label>
                <input
                  id="c1last"
                  type="text"
                  required
                  value={client1LastName}
                  onChange={(e) => setClient1LastName(e.target.value)}
                  className="w-full rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-foreground mb-1">
              Client 2{" "}
              <span className="font-normal text-foreground/50">(optional)</span>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="c2first"
                  className="block text-xs font-medium text-foreground/70 mb-1"
                >
                  First Name
                </label>
                <input
                  id="c2first"
                  type="text"
                  value={client2FirstName}
                  onChange={(e) => setClient2FirstName(e.target.value)}
                  className="w-full rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
              <div>
                <label
                  htmlFor="c2last"
                  className="block text-xs font-medium text-foreground/70 mb-1"
                >
                  Last Name
                </label>
                <input
                  id="c2last"
                  type="text"
                  value={client2LastName}
                  onChange={(e) => setClient2LastName(e.target.value)}
                  className="w-full rounded-lg border border-foreground/20 bg-white px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </div>
          </fieldset>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent text-foreground py-2.5 text-sm font-semibold hover:brightness-105 disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? "Generating..." : "Generate Plan"}
          </button>
        </form>
      </div>
    </main>
  );
}
