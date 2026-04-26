"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  label: string;
  pendingLabel?: string;
};

export function SubmitButton({ label, pendingLabel = "En cours…" }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        marginTop: 14,
        padding: "13px 20px",
        borderRadius: 999,
        background: pending ? "var(--color-muted)" : "var(--color-ink)",
        color: "var(--color-cream)",
        border: "none",
        fontWeight: 500,
        fontSize: 14,
        cursor: pending ? "not-allowed" : "pointer",
        boxShadow: "0 14px 32px rgba(12,12,12,.18)",
        transition: "background 0.2s",
        opacity: pending ? 0.7 : 1,
      }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
