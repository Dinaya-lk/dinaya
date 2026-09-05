import { useMemo, useState } from "react";
import { cn, formatLkr } from "@/lib/utils";
import { BookingServiceArrow } from "@/components/booking/BookingServiceArrow";
import { BookingServicePrice } from "@/components/booking/BookingServicePrice";
import { BookingServiceThumb } from "@/components/booking/BookingServiceThumb";
import { BookingServiceSearch } from "@/components/booking/BookingServiceSearch";
import { BookingServiceListFooter } from "@/components/booking/BookingServiceListFooter";
import { useServiceListWindow } from "@/components/booking/useServiceListWindow";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/badge";
import {
  filterServices,
  shouldShowServiceSearch,
  uniqueServiceCategories,
} from "@/lib/booking/service-list-filter";
import type { BookingService } from "./BookingWizard";
import type { BookingCopy } from "@/lib/i18n";
import type { BookingRouter } from "@/lib/booking-router";

interface Props {
  services: BookingService[];
  selected: BookingService | null;
  copy: BookingCopy;
  bookingRouter?: BookingRouter | null;
  onSelect: (service: BookingService) => void;
}

function ServiceRow({
  service,
  selected,
  copy,
  onSelect,
  showCategory,
}: {
  service: BookingService;
  selected: boolean;
  copy: BookingCopy;
  onSelect: () => void;
  showCategory?: boolean;
}) {
  const depositAmount =
    service.depositPercent > 0
      ? Math.ceil((service.priceLkr * service.depositPercent) / 100)
      : service.priceLkr;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full items-start gap-3 rounded-[1.375rem] border p-3.5 text-left transition-[transform,background-color,box-shadow,border-color] duration-200",
        "motion-reduce:transition-none active:scale-[0.96] motion-reduce:active:scale-100",
        selected
          ? "border-[var(--booking-accent)] bg-[var(--booking-accent-muted)]/50 shadow-sm ring-2 ring-[var(--booking-accent-soft)]"
          : "border-border/50 hover:border-[var(--booking-accent)]/25 hover:bg-[var(--booking-accent-muted)] hover:shadow-sm",
      )}
    >
      <BookingServiceThumb
        name={service.name}
        imageUrl={service.imageUrl}
        fallback="initial"
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium transition-colors duration-200", selected ? "text-[var(--booking-accent)]" : "text-foreground group-hover:text-[var(--booking-accent)]")}>
          {service.name}
        </p>
        {showCategory && service.categoryName ? (
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{service.categoryName}</p>
        ) : null}
        {service.description ? (
          <p className="mt-1 line-clamp-2 text-base text-muted-foreground md:text-xs">{service.description}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <Icon name="clock" />
            {service.durationMinutes}m
          </Badge>
          {service.priceLkr > 0 ? (
            <Badge variant="outline" className="font-medium tabular-nums">
              <BookingServicePrice priceLkr={service.priceLkr} />
            </Badge>
          ) : (
            <Badge variant="outline">Free</Badge>
          )}
          {service.requiresPayment && service.priceLkr > 0 && service.depositPercent > 0 ? (
            <Badge variant="outline">
              {copy.depositDue}: {formatLkr(depositAmount)}
            </Badge>
          ) : null}
        </div>
      </div>
      <BookingServiceArrow selected={selected} />
    </button>
  );
}

export default function StepService({ services, selected, copy, bookingRouter, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => uniqueServiceCategories(services), [services]);
  const filteredServices = useMemo(
    () => filterServices(services, query, activeCategory),
    [services, query, activeCategory],
  );
  const listWindow = useServiceListWindow({
    filteredServices,
    categories,
    query,
    activeCategory,
    uncategorizedLabel: copy.allServices,
  });
  const showSearch = shouldShowServiceSearch(services.length, "wizard");
  const showingLabel = copy.showingServices
    .replace("{count}", String(filteredServices.length))
    .replace("{total}", String(services.length));

  if (services.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {copy.noServices}
      </div>
    );
  }

  const grouped = listWindow.mode === "grouped" && listWindow.groupedServices;
  const flatServices = (listWindow.flatServices ?? []) as BookingService[];

  return (
    <div>
      {bookingRouter && (
        <div className="mb-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {bookingRouter.question}
          </p>
          <div className="space-y-2">
            {bookingRouter.options.map((o) => {
              const target = services.find((s) => s.id === o.serviceId);
              if (!target) return null;
              const isSelected = selected?.id === target.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onSelect(target)}
                  className={cn(
                    "group flex w-full items-center justify-between gap-3 rounded-[1.375rem] border px-3.5 py-3 text-left transition-[transform,background-color,box-shadow,border-color] duration-200",
                    "motion-reduce:transition-none active:scale-[0.96] motion-reduce:active:scale-100",
                    isSelected
                      ? "border-[var(--booking-accent)] bg-[var(--booking-accent-muted)]/50 shadow-sm ring-2 ring-[var(--booking-accent-soft)]"
                      : "border-border/50 hover:border-[var(--booking-accent)]/25 hover:bg-[var(--booking-accent-muted)] hover:shadow-sm",
                  )}
                >
                  <span className={cn("text-sm font-medium transition-colors duration-200", isSelected ? "text-[var(--booking-accent)]" : "text-foreground group-hover:text-[var(--booking-accent)]")}>
                    {o.label}
                  </span>
                  <BookingServiceArrow selected={isSelected} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {bookingRouter ? "Or choose a service" : copy.chooseService}
      </p>

      {showSearch ? (
        <BookingServiceSearch
          query={query}
          onQueryChange={setQuery}
          placeholder={copy.searchServices}
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          allCategoriesLabel={copy.allCategories}
          resultCount={filteredServices.length}
          totalCount={services.length}
          showingLabel={showingLabel}
          className="mb-4"
        />
      ) : null}

      {filteredServices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
          {copy.noServicesMatch}
        </div>
      ) : grouped ? (
        <div className="space-y-5">
          {listWindow.groupedServices!.map((group) => (
            <section key={group.category}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.category}
              </h2>
              <div className="space-y-2">
                {group.services.map((service) => (
                  <ServiceRow
                    key={(service as BookingService).id}
                    service={service as BookingService}
                    selected={selected?.id === (service as BookingService).id}
                    copy={copy}
                    onSelect={() => onSelect(service as BookingService)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {flatServices.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              selected={selected?.id === service.id}
              copy={copy}
              onSelect={() => onSelect(service)}
              showCategory
            />
          ))}
        </div>
      )}

      {filteredServices.length > 0 ? (
        <BookingServiceListFooter
          copy={copy}
          showMore={listWindow.showMore}
          remaining={listWindow.remaining}
          onShowMore={listWindow.onShowMore}
          usePagination={listWindow.usePagination}
          searchPage={listWindow.searchPage}
          totalPages={listWindow.totalPages}
          onSearchPageChange={listWindow.onSearchPageChange}
          className="mt-4"
        />
      ) : null}
    </div>
  );
}
