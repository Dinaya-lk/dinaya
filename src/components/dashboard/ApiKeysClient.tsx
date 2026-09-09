"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Modal, toast } from "@heroui/react";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { DashboardLoadingPanel } from "@/components/dashboard/DashboardLoadingPanel";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { DataTable, type DataTableColumn } from "@/components/dashboard/DataTable";
import { DashboardTextField, DashboardCheckbox } from "@/components/dashboard/DashboardFormField";
import { Button } from "@/components/ui/button";
import { useResource, submitResource } from "@/lib/dashboard/use-resource";
import { API_KEY_SCOPES, type ApiKeyScope } from "@/lib/api-key-scopes";
import { dashboardErrorAlertClass, dashboardOutlineActionClass, dashboardPrimaryActionClass } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";
import {
  isVoiceReceptionistRolloutOpen,
  isVoiceScope,
} from "@/lib/voice-receptionist";

type ApiKeyRow = {
  id: string;
  name: string;
  keyType?: "generic" | "desktop" | "mobile";
  deviceId?: string | null;
  deviceName?: string | null;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

const selectableApiKeyScopes = API_KEY_SCOPES.filter(
  (scope) => isVoiceReceptionistRolloutOpen() || !isVoiceScope(scope),
);

const emptyForm = { name: "", scopes: ["bookings:read", "bookings:write"] as ApiKeyScope[] };

export function ApiKeysClient() {
  const { data, setData, loading } = useResource<ApiKeyRow[]>("/api/dashboard/api-keys");
  const keys = data ?? [];
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [connectingDesktop, setConnectingDesktop] = useState(false);

  function toggleScope(scope: ApiKeyScope) {
    setForm((f) => {
      const next = f.scopes.includes(scope)
        ? f.scopes.filter((item) => item !== scope)
        : [...f.scopes, scope];
      return { ...f, scopes: next.length > 0 ? next : [scope] };
    });
  }

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFormError("");
    const result = await submitResource("/api/dashboard/api-keys", form, "POST");
    setCreating(false);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    const created = result.data as ApiKeyRow & { rawKey: string };
    setData((prev) => [created, ...(prev ?? [])]);
    setRawKey(created.rawKey);
    setForm(emptyForm);
    setModalOpen(false);
  }

  async function createDesktopKey() {
    setConnectingDesktop(true);
    const deviceName = typeof window === "undefined" ? "Desktop Device" : window.navigator.platform || "Desktop Device";
    const result = await submitResource(
      "/api/dashboard/api-keys",
      {
        name: `Desktop - ${deviceName}`,
        keyType: "desktop",
        deviceName,
        scopes: ["desktop:read", "desktop:bookings"],
      },
      "POST",
    );
    setConnectingDesktop(false);
    if (!result.ok) {
      toast.danger("Could not create desktop key", { description: result.error });
      return;
    }
    const created = result.data as ApiKeyRow & { rawKey: string };
    setData((prev) => [created, ...(prev ?? [])]);
    setRawKey(created.rawKey);
  }

  async function revoke(id: string) {
    await fetch(`/api/dashboard/api-keys/${id}`, { method: "DELETE" });
    setData((prev) => (prev ?? []).filter((key) => key.id !== id));
    toast.success("API key revoked");
  }

  const columns: DataTableColumn<ApiKeyRow>[] = [
    {
      key: "name",
      header: "Key",
      render: (key) => (
        <div>
          <p className="font-medium">{key.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {key.keyType === "desktop"
              ? "Desktop key"
              : key.keyType === "mobile"
                ? "Mobile key"
                : "Generic key"}
            {key.deviceName ? ` · ${key.deviceName}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "scopes",
      header: "Scopes",
      render: (key) => (
        <div className="flex flex-wrap gap-1">
          {key.scopes.map((scope) => (
            <code key={scope} className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {scope}
            </code>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (key) => (
        <span className="text-xs text-muted-foreground">
          {key.revokedAt ? "Revoked" : key.lastUsedAt ? "Active" : "Never used"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (key) =>
        key.revokedAt ? null : (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmRevokeId(key.id)}
          >
            Revoke
          </button>
        ),
    },
  ];

  const revokeTarget = keys.find((key) => key.id === confirmRevokeId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => void createDesktopKey()}
          disabled={connectingDesktop}
          className={cn(dashboardOutlineActionClass, "disabled:opacity-50")}
        >
          {connectingDesktop ? "Connecting…" : "Connect Desktop"}
        </button>
        <button type="button" onClick={() => setModalOpen(true)} className={dashboardPrimaryActionClass}>
          Generate key
        </button>
      </div>

      {rawKey && (
        <DashboardSection muted>
          <p className="mb-1 text-sm font-medium">Copy this key now — it won&apos;t be shown again.</p>
          <code className="break-all rounded bg-muted px-2 py-1 text-xs">{rawKey}</code>
          <button onClick={() => setRawKey(null)} className="ml-3 text-xs text-primary hover:underline">
            Dismiss
          </button>
        </DashboardSection>
      )}

      {loading ? (
        <DashboardLoadingPanel rows={2} />
      ) : keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No API keys yet"
          description="Generate a scoped key to connect a custom integration or the Dinaya desktop app."
        />
        <DataTable columns={columns} rows={keys} getRowId={(key) => key.id} />
      )}

      {/* Hoisted outside the table: react-aria's Table caches each row's rendered
          cells keyed by row identity, so a dialog mounted inside a column's render
          never re-renders on state that isn't part of the row data — it would stay
          permanently closed. */}
      <ConfirmDialog
        title="Revoke API key"
        description={revokeTarget ? `Revoke "${revokeTarget.name}"? Any integration using this key will stop working immediately.` : ""}
        confirmLabel="Revoke"
        variant="destructive"
        onConfirm={() => {
          if (confirmRevokeId) return revoke(confirmRevokeId);
        }}
        open={confirmRevokeId !== null}
        onOpenChange={(open) => setConfirmRevokeId(open ? confirmRevokeId : null)}
      />

      <Modal.Root
        isOpen={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setForm(emptyForm);
            setFormError("");
          }
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Generate API key</Modal.Heading>
              </Modal.Header>
              <form onSubmit={createKey}>
                <Modal.Body className="space-y-4">
                  <DashboardTextField
                    label="Integration name"
                    isRequired
                    value={form.name}
                    onChange={(value) => setForm((f) => ({ ...f, name: value }))}
                    placeholder="e.g. Zapier"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">Scopes</p>
                    <div className="mt-2 space-y-2">
                      {selectableApiKeyScopes.map((scope) => (
                        <DashboardCheckbox
                          key={scope}
                          isSelected={form.scopes.includes(scope)}
                          onChange={() => toggleScope(scope)}
                          label={<code className="text-xs">{scope}</code>}
                        />
                      ))}
                    </div>
                  </div>
                  {formError ? <p className={dashboardErrorAlertClass}>{formError}</p> : null}
                </Modal.Body>
                <Modal.Footer>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 w-full sm:w-auto"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating} className="min-h-11 w-full sm:w-auto">
                    {creating ? "Generating…" : "Generate key"}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal.Root>
    </div>
  );
}
