"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

interface Props {
  reviewToken: string;
  businessName: string;
}

export default function ReviewPrompt({ reviewToken, businessName }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState("");

  if (dismissed) return null;

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-xs">
        <Icon name="stars" className="mb-2 block text-2xl text-amber-400" />
        <p className="text-sm font-medium text-foreground">Thanks for your review!</p>
        <p className="mt-1 text-xs text-muted-foreground">It helps others discover {businessName}.</p>
      </div>
    );
  }

  async function submit() {
    if (rating === 0) return;
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/reviews/signed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: reviewToken, rating, comment }),
    });
    if (res.ok) {
      setDone(true);
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setError(data.error ?? "Something went wrong.");
    }
    setSubmitting(false);
  }

  const displayRating = hovered || rating;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">How was your experience?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Leave a quick review for {businessName}</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="mt-0.5 text-lg leading-none text-muted-foreground transition-colors hover:text-foreground"
        >
          <Icon name="x-lg" />
        </button>
      </div>

      <div className="mb-4 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="text-2xl transition-transform hover:scale-110"
          >
            <Icon name={n <= displayRating ? "star-fill" : "star"} className={n <= displayRating ? "text-amber-400" : "text-muted-foreground/40"} />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-1 text-xs text-muted-foreground">
            {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
          </span>
        )}
      </div>

      {rating > 0 && (
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share a few words about your experience (optional)…"
          className="mb-3 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
        />
      )}

      {error ? <p className="mb-3 text-xs text-destructive">{error}</p> : null}

      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={rating === 0 || submitting}
          className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
