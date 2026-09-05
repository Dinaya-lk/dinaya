import { buildAbsoluteAppUrl } from "@/lib/docs/site-url";

export type DocsAiProviderId =
  | "chatgpt"
  | "claude"
  | "perplexity"
  | "grok";

export type DocsAiProviderLaunch =
  | { strategy: "query"; queryParam: string }
  | { strategy: "clipboard-only" };

export type DocsAiProvider = {
  id: DocsAiProviderId;
  label: string;
  baseUrl: string;
  launch: DocsAiProviderLaunch;
};

export type DocsAiPromptInput = {
  title: string;
  summary: string;
  canonicalPath: string;
  markdownPath: string;
};

export const DOCS_AI_PROVIDERS: DocsAiProvider[] = [
  {
    id: "chatgpt",
    label: "ChatGPT",
    baseUrl: "https://chatgpt.com/",
    launch: { strategy: "query", queryParam: "q" },
  },
  {
    id: "claude",
    label: "Claude",
    baseUrl: "https://claude.ai/new",
    launch: { strategy: "query", queryParam: "q" },
  },
  {
    id: "perplexity",
    label: "Perplexity",
    baseUrl: "https://www.perplexity.ai/",
    launch: { strategy: "query", queryParam: "q" },
  },
  {
    id: "grok",
    label: "Grok",
    baseUrl: "https://grok.com/",
    launch: { strategy: "query", queryParam: "q" },
  },
];

function trimMultiline(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function buildDocsAiPrompt(input: DocsAiPromptInput): string {
  const canonicalUrl = buildAbsoluteAppUrl(input.canonicalPath);
  const markdownUrl = buildAbsoluteAppUrl(input.markdownPath);
  const summary = trimMultiline(input.summary);

  return [
    "You are helping with Dinaya documentation.",
    `Page: ${input.title}`,
    `Summary: ${summary}`,
    `Canonical URL: ${canonicalUrl}`,
    `Markdown URL: ${markdownUrl}`,
    "Please answer using information from this page first. If something is missing, clearly say what is not documented.",
  ].join("\n");
}

export function buildDocsAiLaunchUrl(
  provider: Pick<DocsAiProvider, "baseUrl" | "launch">,
  prompt: string,
): string {
  if (provider.launch.strategy === "clipboard-only") {
    return provider.baseUrl;
  }

  const url = new URL(provider.baseUrl);
  url.searchParams.set(provider.launch.queryParam, prompt);
  return url.toString();
}

