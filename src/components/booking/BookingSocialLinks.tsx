import { Icon } from "@/components/ui/Icon";

type Props = {
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  websiteUrl?: string | null;
};

const linkClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-[var(--booking-accent)]/40 hover:text-[var(--booking-accent)]";

export function BookingSocialLinks({ instagramUrl, facebookUrl, websiteUrl }: Props) {
  if (!instagramUrl && !facebookUrl && !websiteUrl) return null;

  return (
    <div className="mt-3 flex items-center justify-center gap-2">
      {instagramUrl ? (
        <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={linkClass} aria-label="Instagram">
          <Icon name="instagram" />
        </a>
      ) : null}
      {facebookUrl ? (
        <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className={linkClass} aria-label="Facebook">
          <Icon name="facebook" />
        </a>
      ) : null}
      {websiteUrl ? (
        <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className={linkClass} aria-label="Website">
          <Icon name="globe" />
        </a>
      ) : null}
    </div>
  );
}
