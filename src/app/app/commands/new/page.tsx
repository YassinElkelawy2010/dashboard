"use client";

import { CommandForm, defaultCommandFormValue } from "@/components/CommandForm";

export default function NewCommandPage() {
  return <CommandForm mode="create" initial={defaultCommandFormValue()} />;
}
