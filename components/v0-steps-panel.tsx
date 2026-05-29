"use client";

import { CheckCircle2, CircleDashed, FileText, XCircle } from "lucide-react";
import type { GeneratedWebsiteResult } from "@/hooks/use-website-generator";

interface V0StepsPanelProps {
  steps: GeneratedWebsiteResult["steps"];
  isGenerating?: boolean;
  error?: string | null;
}

export function V0StepsPanel({
  steps,
  isGenerating,
  error,
}: V0StepsPanelProps) {
  if (!steps.length && !isGenerating && !error) return null;

  return (
    <div className="mx-auto w-full px-4 pb-4 md:max-w-3xl">
      <div className="space-y-3 rounded-lg border border-border/70 bg-card px-4 py-4 text-sm shadow-sm">
        {steps.map((step, index) => {
          const Icon =
            step.status === "failed"
              ? XCircle
              : step.status === "running"
                ? CircleDashed
                : index < 2
                  ? CheckCircle2
                  : FileText;

          return (
            <div key={`${step.label}-${index}`} className="flex gap-3">
              <Icon
                className={
                  step.status === "running"
                    ? "mt-0.5 size-4 animate-spin text-muted-foreground"
                    : step.status === "failed"
                      ? "mt-0.5 size-4 text-destructive"
                      : "mt-0.5 size-4 text-muted-foreground"
                }
              />
              <div className="min-w-0">
                <p className="break-words text-foreground">{step.label}</p>
                {step.detail && (
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {step.detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
