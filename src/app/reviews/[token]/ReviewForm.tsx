"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

export function ReviewForm({ token, clientName }: { token: string; clientName: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit() {
    setStatus("saving");
    setError("");
    const res = await fetch("/api/reviews/signed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, rating, comment }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not submit review.");
      setStatus("error");
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border bg-white dark:border-neutral-800 dark:bg-neutral-900 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
          <Icon name="check-lg" aria-hidden="true" />
        </div>
        <h1 className="font-cal text-2xl">Thank you</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your review has been submitted.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white dark:border-neutral-800 dark:bg-neutral-900 p-6 shadow-sm">
      <p className="text-sm text-muted-foreground">Hi {clientName},</p>
      <h1 className="mt-1 font-cal text-2xl">How was your visit?</h1>
      <div className="mt-6">
        <label className="text-sm font-medium">Rating</label>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={`flex size-10 items-center justify-center rounded-full border text-sm font-semibold ${
                value <= rating ? "border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-700" : "text-muted-foreground"
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <label className="mt-5 block text-sm font-medium">
        Comment
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          className="mt-2 w-full resize-y rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Share a few words about your experience..."
        />
      </label>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={status === "saving"}
        className="mt-5 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {status === "saving" ? "Submitting..." : "Submit review"}
      </button>
    </div>
  );
}
