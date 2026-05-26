"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CommandForm, commandFormValueFromApi } from "@/components/CommandForm";

export default function NativeCommandEditPage() {
  const params = useParams<{ name: string }>();
  const catalogKey = useMemo(() => decodeURIComponent(String(params?.name ?? "")), [params?.name]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initial, setInitial] = useState<ReturnType<typeof commandFormValueFromApi> | null>(null);
  const [lockOptions, setLockOptions] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!catalogKey) {
      setLoading(false);
      setError("Missing command.");
      return;
    }

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/native-commands/${encodeURIComponent(catalogKey)}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || json?.ok === false) {
          throw new Error(json?.error?.message || "Failed to load command.");
        }
        const cmd = json.data.command;
        if (!cancelled) {
          setInitial(commandFormValueFromApi(cmd));
          setLockOptions(Boolean(cmd.optionsLocked));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load command.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [catalogKey]);

  if (loading) {
    return <div className="text-sm text-white/60">Loading…</div>;
  }

  if (error || !initial) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{error ?? "Not found."}</div>
    );
  }

  return (
    <CommandForm key={catalogKey} mode="editNative" nativeCatalogKey={catalogKey} initial={initial} lockOptions={lockOptions} />
  );
}
