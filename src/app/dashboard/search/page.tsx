import Link from "next/link";
import { format } from "date-fns";
import { Calendar, Scissors, Search, Users } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { db } from "@/db";
import { bookings, clients, services } from "@/db/schema";
import { requireBusiness } from "@/lib/auth";
import { dashboardCardClass, dashboardPageClass } from "@/lib/dashboard-ui";
import { likePattern } from "@/lib/like";
import { cn } from "@/lib/utils";
import { eq, ilike, or, and, desc } from "drizzle-orm";

export default async function DashboardSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { businessId } = await requireBusiness();
  const q = ((await searchParams).q ?? "").trim();

  if (!q) {
    return (
      <div className={dashboardPageClass}>
        <DashboardPageHeader title="Search" />
        <EmptyState
          icon={Search}
          title="Search your business"
          description="Use ⌘K (or the search bar above) to find bookings, clients, or services by name, phone, or email."
        />
      </div>
    );
  }

  const pattern = likePattern(q);

  const [clientRows, bookingRows, serviceRows] = await Promise.all([
    db
      .select({
        id: clients.id,
        name: clients.name,
        phone: clients.phone,
        email: clients.email,
      })
      .from(clients)
      .where(
        and(
          eq(clients.businessId, businessId),
          or(ilike(clients.name, pattern), ilike(clients.phone, pattern), ilike(clients.email, pattern)),
        ),
      )
      .orderBy(desc(clients.createdAt))
      .limit(10),
    db
      .select({
        id: bookings.id,
        clientName: bookings.clientName,
        startsAt: bookings.startsAt,
        status: bookings.status,
        serviceName: services.name,
      })
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .where(
        and(
          eq(bookings.businessId, businessId),
          or(
            ilike(bookings.clientName, pattern),
            ilike(bookings.clientPhone, pattern),
            ilike(bookings.clientEmail, pattern),
            ilike(services.name, pattern),
          ),
        ),
      )
      .orderBy(desc(bookings.startsAt))
      .limit(10),
    db
      .select({ id: services.id, name: services.name, durationMinutes: services.durationMinutes })
      .from(services)
      .where(and(eq(services.businessId, businessId), ilike(services.name, pattern)))
      .orderBy(services.name)
      .limit(10),
  ]);

  const total = clientRows.length + bookingRows.length + serviceRows.length;

  return (
    <div className={dashboardPageClass}>
      <DashboardPageHeader
        title="Search results"
        description={
          total === 0
            ? `No matches for “${q}”`
            : `${total} result${total === 1 ? "" : "s"} for “${q}”`
        }
      />

      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Users className="size-3.5" /> Clients
        </h2>
        {clientRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching clients.</p>
        ) : (
          <ul className={cn(dashboardCardClass, "divide-y overflow-hidden")}>
            {clientRows.map((client) => (
              <li key={client.id}>
                <Link href={`/dashboard/clients/${client.id}`} className="block px-4 py-3 hover:bg-muted/40">
                  <p className="font-medium">{client.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {client.phone}
                    {client.email ? ` · ${client.email}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Calendar className="size-3.5" /> Bookings
        </h2>
        {bookingRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching bookings.</p>
        ) : (
          <ul className={cn(dashboardCardClass, "divide-y overflow-hidden")}>
            {bookingRows.map((booking) => (
              <li key={booking.id}>
                <Link href={`/dashboard/bookings/${booking.id}`} className="block px-4 py-3 hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{booking.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.serviceName} · {format(booking.startsAt, "d MMM yyyy, h:mm a")}
                      </p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Scissors className="size-3.5" /> Services
        </h2>
        {serviceRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching services.</p>
        ) : (
          <ul className={cn(dashboardCardClass, "divide-y overflow-hidden")}>
            {serviceRows.map((service) => (
              <li key={service.id}>
                <Link href={`/dashboard/services/${service.id}`} className="block px-4 py-3 hover:bg-muted/40">
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-muted-foreground">{service.durationMinutes} minutes</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
