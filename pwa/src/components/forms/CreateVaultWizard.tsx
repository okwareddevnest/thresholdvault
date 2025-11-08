"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUiStore } from "@/state/uiStore";
import { createVault } from "@/services/vaultService";
import { useVaultStore } from "@/state/vaultStore";
import type { CreateVaultPayload } from "@/types/vault";

const guardianSchema = z.object({
  email: z.string().email(),
  alias: z.string().min(2).max(32),
});

const heirSchema = z.object({
  address: z.string().min(10),
  weightBps: z.number().min(1).max(10_000),
});

const formSchema = z.object({
  name: z.string().min(3).max(32),
  heartbeatInterval: z.number().min(7).max(180),
  allowedMisses: z.number().min(1).max(6),
  guardians: z.array(guardianSchema).min(3).max(5),
  threshold: z.number().min(2),
  heirs: z.array(heirSchema).min(1),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  name: "",
  heartbeatInterval: 30,
  allowedMisses: 3,
  guardians: [
    { email: "", alias: "" },
    { email: "", alias: "" },
    { email: "", alias: "" },
  ],
  threshold: 2,
  heirs: [{ address: "", weightBps: 10_000 }],
};

export function CreateVaultWizard() {
  const show = useUiStore((state) => state.showCreateVault);
  const toggle = useUiStore((state) => state.toggleCreateVault);
  const setVaults = useVaultStore((state) => state.setVaults);
  const vaults = useVaultStore((state) => state.vaults);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues,
    resolver: zodResolver(formSchema),
  });

  const guardianArray = useFieldArray({
    control,
    name: "guardians",
  });
  const heirArray = useFieldArray({
    control,
    name: "heirs",
  });

  const [formMessage, setFormMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const onSubmit = async (values: FormValues) => {
    const totalWeight = values.heirs.reduce(
      (sum, heir) => sum + heir.weightBps,
      0,
    );
    if (totalWeight !== 10_000) {
      setFormMessage({
        type: "error",
        text: "Heir weights must total 10,000 basis points.",
      });
      return;
    }
    const payload: CreateVaultPayload = {
      name: values.name,
      guardians: values.guardians,
      guardianThreshold: values.threshold,
      heartbeat: {
        intervalDays: values.heartbeatInterval,
        allowedMisses: values.allowedMisses,
      },
      heirRecords: values.heirs,
    };
    setSubmitting(true);
    try {
      const vault = await createVault(payload);
      setVaults([...vaults, vault]);
      setFormMessage({
        type: "success",
        text: "Vault created successfully. Deploy guardians to finalize activation.",
      });
      toggle(false);
    } catch (error) {
      setFormMessage({
        type: "error",
        text: (error as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-navy/80 px-4 py-8">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-3xl rounded-card border border-border-subtle bg-card-background p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-text-primary">
            Create Inheritance Vault
          </h2>
          <button
            type="button"
            className="text-text-secondary"
            onClick={() => toggle(false)}
          >
            Close
          </button>
        </div>
        <div className="mt-4 flex items-center gap-4 text-sm text-text-secondary">
          {["Details", "Guardians", "Heirs"].map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  idx === step
                    ? "bg-icp-cyan text-deep-navy"
                    : "bg-border-subtle text-text-secondary"
                }`}
              >
                {idx + 1}
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-4">
          {step === 0 && (
            <>
              <label className="block text-sm text-text-secondary">
                Vault Name
                <input
                  {...register("name")}
                  className="mt-1 w-full rounded border border-border-subtle bg-transparent px-3 py-2 text-text-primary"
                />
                {errors.name && (
                  <span className="text-xs text-error-red">
                    {errors.name.message}
                  </span>
                )}
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm text-text-secondary">
                  Heartbeat Interval (days)
                  <input
                    type="number"
                    {...register("heartbeatInterval", { valueAsNumber: true })}
                    className="mt-1 w-full rounded border border-border-subtle bg-transparent px-3 py-2 text-text-primary"
                  />
                </label>
                <label className="block text-sm text-text-secondary">
                  Allowed Misses
                  <input
                    type="number"
                    {...register("allowedMisses", { valueAsNumber: true })}
                    className="mt-1 w-full rounded border border-border-subtle bg-transparent px-3 py-2"
                  />
                </label>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <label className="block text-sm text-text-secondary">
                Guardian Threshold
                <input
                  type="number"
                  {...register("threshold", { valueAsNumber: true })}
                  className="mt-1 w-full rounded border border-border-subtle bg-transparent px-3 py-2"
                />
              </label>
              <div className="space-y-4">
                {guardianArray.fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="rounded border border-border-subtle p-4"
                  >
                    <p className="text-sm text-text-secondary">Guardian {idx + 1}</p>
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                      <input
                        placeholder="Email"
                        {...register(`guardians.${idx}.email` as const)}
                        className="rounded border border-border-subtle bg-transparent px-3 py-2"
                      />
                      <input
                        placeholder="Alias"
                        {...register(`guardians.${idx}.alias` as const)}
                        className="rounded border border-border-subtle bg-transparent px-3 py-2"
                      />
                    </div>
                  </div>
                ))}
                {guardianArray.fields.length < 5 && (
                  <button
                    type="button"
                    className="text-sm font-semibold text-icp-cyan"
                    onClick={() =>
                      guardianArray.append({ email: "", alias: "" })
                    }
                  >
                    + Add Guardian
                  </button>
                )}
              </div>
            </>
          )}
          {step === 2 && (
            <div className="space-y-4">
              {heirArray.fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="rounded border border-border-subtle p-4"
                >
                  <p className="text-sm text-text-secondary">Heir {idx + 1}</p>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <input
                      placeholder="Taproot Address"
                      {...register(`heirs.${idx}.address` as const)}
                      className="rounded border border-border-subtle bg-transparent px-3 py-2"
                    />
                    <input
                      type="number"
                      placeholder="Weight (bps)"
                      {...register(`heirs.${idx}.weightBps` as const, {
                        valueAsNumber: true,
                      })}
                      className="rounded border border-border-subtle bg-transparent px-3 py-2"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="text-sm font-semibold text-icp-cyan"
                onClick={() =>
                  heirArray.append({ address: "", weightBps: 1000 })
                }
              >
                + Add Heir
              </button>
            </div>
          )}
        </div>
        {formMessage && (
          <div
            className={`mt-4 rounded border px-4 py-3 text-sm ${
              formMessage.type === "error"
                ? "border-error-red/40 bg-error-red/10 text-error-red"
                : "border-success-green/40 bg-success-green/10 text-success-green"
            }`}
          >
            {formMessage.text}
          </div>
        )}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep(Math.max(step - 1, 0))}
            disabled={step === 0}
            className="rounded-full border border-border-subtle px-4 py-2 text-sm text-text-secondary disabled:opacity-40"
          >
            Back
          </button>
          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep(Math.min(step + 1, 2))}
              className="rounded-full bg-icp-cyan px-6 py-2 text-sm font-semibold text-deep-navy"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-icp-cyan px-6 py-2 text-sm font-semibold text-deep-navy"
            >
              {submitting ? "Creating..." : "Activate Vault"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
