export function hubTagline(description: string | null | undefined, fallback: string): string {
  const text = description?.trim();
  if (!text) return fallback;

  const match = text.match(/^[\s\S]*?[.!?](?=\s|$)/);
  if (match && match[0].length <= 180) return match[0].trim();
  if (text.length <= 180) return text;

  return fallback;
}

const CATEGORY_ICON: Record<string, string> = {
  colour: "droplet-half",
  color: "droplet-half",
  consultations: "chat-dots",
  consultation: "chat-dots",
  grooming: "person",
  treatments: "gem",
  treatment: "gem",
};

export function serviceIconName(serviceName: string, categoryName?: string | null): string {
  const category = categoryName?.trim().toLowerCase();
  if (category && CATEGORY_ICON[category]) return CATEGORY_ICON[category];

  const n = serviceName.toLowerCase();
  if (n.includes("beard") || n.includes("shave") || n.includes("trim")) return "person";
  if (n.includes("colour") || n.includes("color") || n.includes("dye") || n.includes("tint")) {
    return "droplet-half";
  }
  if (n.includes("consult")) return "chat-dots";
  if (n.includes("nail") || n.includes("spa") || n.includes("massage")) return "gem";
  return "scissors";
}

export function formatHubLocationLine(address?: string | null, phone?: string | null): string | null {
  const parts = [address?.trim(), phone?.trim()].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(" · ");
}
