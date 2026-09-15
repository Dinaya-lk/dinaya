"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Tabs, toast } from "@heroui/react";
import { DashboardLoadingPanel } from "@/components/dashboard/DashboardLoadingPanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { DataTable, type DataTableColumn } from "@/components/dashboard/DataTable";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { DashboardSelect, DashboardTextAreaField } from "@/components/dashboard/DashboardFormField";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { submitResource } from "@/lib/dashboard/use-resource";
import { CalendarPlus, NotebookText } from "lucide-react";
import {
  CLIENT_STAGE_BADGE_CLASS,
  dashboardOutlineActionClass,
  dashboardPageClass,
  dashboardPrimaryActionClass,
  dashboardSectionClass,
} from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import { whatsappUrl } from "@/lib/whatsapp";

type Booking = {
  id: string;
  startsAt: string;
  status: string;
  serviceName: string;
  staffName: string;
};

type Note = {
  id: string;
  body: string;
  createdAt: string;
};

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  stage: "lead" | "prospect" | "active" | "churned";
  source: string | null;
  tags: string[] | null;
  internalNotes: string | null;
  createdAt: string;
};

const STAGES = ["lead", "prospect", "active", "churned"] as const;

const STAGE_STYLES = CLIENT_STAGE_BADGE_CLASS;

const bookingColumns: DataTableColumn<Booking>[] = [
  {
    key: "date",
    header: "Date",
    className: "tabular-nums",
    render: (b) => format(new Date(b.startsAt), "d MMM yyyy, h:mm a"),
  },
  { key: "service", header: "Service", render: (b) => b.serviceName },
  { key: "staff", header: "Staff", className: "text-muted-foreground", render: (b) => b.staffName },
  { key: "status", header: "Status", render: (b) => <StatusBadge status={b.status} /> },
  {
    key: "link",
    header: "",
    align: "right",
    render: (b) => (
      <Link href={`/dashboard/bookings/${b.id}`} className="text-primary hover:underline">
        View
      </Link>
    ),
  },
];

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<Client | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("bookings");

  const [editStage, setEditStage] = useState<(typeof STAGES)[number]>("lead");
  const [editInternalNotes, setEditInternalNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [noteBody, setNoteBody] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    fetch(`/api/dashboard/clients/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json();
      })
      .then(({ client, bookings, notes }) => {
        if (!client?.id) throw new Error("Client not found");
        setClient(client);
        setBookings(bookings ?? []);
        setNotes(notes ?? []);
        setEditStage(client.stage);
        setEditInternalNotes(client.internalNotes ?? "");
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        toast.danger("Could not load client", {
          description: "Check your connection and try again.",
        });
      });
  }, [id]);

  async function saveProfile() {
    setSaving(true);
    const result = await submitResource(`/api/dashboard/clients/${id}`, {
      stage: editStage,
      internalNotes: editInternalNotes,
    });
    setSaving(false);
    if (!result.ok) {
      toast.danger("Could not save client", { description: result.error });
      return;
    }
    setClient(result.data as Client);
    toast.success("Client saved");
  }

  async function addNote() {
    if (!noteBody.trim()) return;
    setAddingNote(true);
    const result = await submitResource(`/api/dashboard/clients/${id}/notes`, { body: noteBody }, "POST");
    setAddingNote(false);
    if (!result.ok) {
      toast.danger("Could not add note", { description: result.error });
      return;
    }
    setNotes((prev) => [result.data as Note, ...prev]);
    setNoteBody("");
    toast.success("Note added");
  }

  if (loading) {
    return (
      <div className={dashboardPageClass}>
        <DashboardLoadingPanel rows={4} />
      </div>
    );
  }

  if (!client) {
    return <div className="p-8 text-sm text-muted-foreground">Client not found.</div>;
  }

  return (
    <Tabs.Root selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(String(key))} className={dashboardPageClass}>
      <DashboardPageHeader
        backHref="/dashboard/clients"
        backLabel="Clients"
        title={client.name}
        actions={
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
              STAGE_STYLES[client.stage],
            )}
          >
            {client.stage}
          </span>
        }
        tabs={
          <Tabs.List>
            <Tabs.Tab id="bookings">Bookings ({bookings.length})</Tabs.Tab>
            <Tabs.Tab id="notes">Notes ({notes.length})</Tabs.Tab>
          </Tabs.List>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className={cn(dashboardSectionClass, "space-y-3")}>
            <h2 className="text-sm font-medium">Contact</h2>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm font-medium">{client.phone}</p>
            </div>
            <a
              href={whatsappUrl(client.phone, `Hi ${client.name},`)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(dashboardOutlineActionClass, "w-full justify-center")}
            >
              WhatsApp
            </a>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{client.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Source</p>
              <p className="text-sm font-medium capitalize">
                {client.source?.replace("_", " ") ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Client since</p>
              <p className="text-sm font-medium">
                {format(new Date(client.createdAt), "d MMM yyyy")}
              </p>
            </div>
          </div>

          <div className={cn(dashboardSectionClass, "space-y-3")}>
            <h2 className="text-sm font-medium">CRM</h2>
            <DashboardSelect
              label="Stage"
              value={editStage}
              onChange={(value) => setEditStage(value)}
              options={STAGES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
            />
            <DashboardTextAreaField
              label="Internal notes"
              rows={4}
              value={editInternalNotes}
              onChange={setEditInternalNotes}
            />
            <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-5 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur-sm supports-backdrop-filter:bg-background/80 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className={cn(dashboardPrimaryActionClass, "w-full justify-center")}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Tabs.Panel id="bookings">
            {bookings.length === 0 ? (
              <EmptyState
                icon={CalendarPlus}
                title="No bookings yet"
                description="This client hasn't booked an appointment yet."
                action={
                  <Link href="/dashboard/bookings/new" className={dashboardPrimaryActionClass}>
                    Create booking
                  </Link>
                }
              />
            ) : (
              <DataTable columns={bookingColumns} rows={bookings} getRowId={(b) => b.id} />
            )}
          </Tabs.Panel>

          <Tabs.Panel id="notes">
            <div className={cn(dashboardSectionClass, "space-y-4")}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <DashboardTextAreaField
                  label="Add a note"
                  className="flex-1"
                  rows={2}
                  placeholder="Add a note…"
                  value={noteBody}
                  onChange={setNoteBody}
                />
                <button
                  type="button"
                  onClick={addNote}
                  disabled={addingNote || !noteBody.trim()}
                  className={cn(dashboardPrimaryActionClass, "shrink-0 justify-center")}
                >
                  {addingNote ? "…" : "Add"}
                </button>
              </div>

              {notes.length === 0 ? (
                <EmptyState icon={NotebookText} title="No notes yet" />
              ) : (
                <div className="space-y-3">
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-lg border px-4 py-3 text-sm">
                      <p className="whitespace-pre-wrap">{n.body}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {format(new Date(n.createdAt), "d MMM yyyy, h:mm a")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Tabs.Panel>
        </div>
      </div>
    </Tabs.Root>
  );
}
