import { afterEach, describe, expect, it } from "vitest";
import {
  buildDocsAiLaunchUrl,
  buildDocsAiPrompt,
  DOCS_AI_PROVIDERS,
} from "@/lib/docs/ai-actions";

describe("docs ai actions", () => {
  const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (previousAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
      return;
    }
    process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
  });

  it("builds provider launch urls with query prefill when supported", () => {
    const provider = DOCS_AI_PROVIDERS.find((item) => item.id === "chatgpt");
    expect(provider).toBeDefined();
    const url = buildDocsAiLaunchUrl(provider!, "How do I connect PayHere?");
    expect(url).toContain("chatgpt.com");
    expect(url).toContain("q=How+do+I+connect+PayHere%3F");
  });

  it("falls back to provider base url for clipboard-only providers", () => {
    const provider = {
      id: "x",
      label: "X",
      baseUrl: "https://example.com/",
      launch: { strategy: "clipboard-only" as const },
    };
    const url = buildDocsAiLaunchUrl(provider, "Any prompt");
    expect(url).toBe("https://example.com/");
  });

  it("includes canonical and markdown urls in prompt", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://dinaya.lk";

    const prompt = buildDocsAiPrompt({
      title: "Set up your booking page",
      summary: "Go from sign-up to a live booking link in about five minutes.",
      canonicalPath: "/docs/guides/setup-booking-page",
      markdownPath: "/docs/guides/setup-booking-page.md",
    });

    expect(prompt).toContain("Page: Set up your booking page");
    expect(prompt).toContain("Canonical URL: https://dinaya.lk/docs/guides/setup-booking-page");
    expect(prompt).toContain("Markdown URL: https://dinaya.lk/docs/guides/setup-booking-page.md");
  });
});
