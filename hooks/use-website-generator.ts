import { useState, useCallback } from "react";

export interface GeneratedWebsiteResult {
  chatId: string;
  versionId?: string;
  demoUrl?: string;
  rawDemoUrl?: string;
  screenshotUrl?: string;
  deploymentUrl?: string;
  webUrl: string;
  status?: "pending" | "completed" | "failed";
  assistantText?: string;
  steps: Array<{
    label: string;
    detail?: string;
    status: "done" | "running" | "failed";
  }>;
  files: Array<{
    name: string;
    content: string;
  }>;
}

export function useWebsiteGenerator() {
  const [generatedWebsite, setGeneratedWebsite] =
    useState<GeneratedWebsiteResult | null>(null);
  const [steps, setSteps] = useState<GeneratedWebsiteResult["steps"]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollForPreview = useCallback(
    async (initialResult: GeneratedWebsiteResult) => {
      let latestResult = initialResult;

      for (let attempt = 0; attempt < 30; attempt += 1) {
        if (latestResult.demoUrl) return latestResult;
        if (attempt >= 9 && latestResult.screenshotUrl) return latestResult;

        setSteps((currentSteps) => [
          ...currentSteps.filter((step) => step.label !== "Preview preparing"),
          {
            label: "Preview preparing",
            detail: "Waiting for v0 to publish the live preview URL",
            status: "running",
          },
        ]);

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const response = await fetch(
          `/api/generate-website?chatId=${encodeURIComponent(
            initialResult.chatId
          )}`
        );

        if (!response.ok) continue;

        latestResult = (await response.json()) as GeneratedWebsiteResult;
        setGeneratedWebsite(latestResult);
        setSteps(latestResult.steps);
      }

      return latestResult;
    },
    []
  );

  const generateWebsite = useCallback(async (description: string) => {
    setIsGenerating(true);
    setError(null);
    setSteps([
      {
        label: "Thought",
        detail: "v0 is planning the website",
        status: "running",
      },
    ]);

    try {
      const response = await fetch("/api/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          chatId: generatedWebsite?.chatId,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Website generation failed");
      }

      const result = (await response.json()) as GeneratedWebsiteResult;
      const previewReadyResult = await pollForPreview(result);
      setGeneratedWebsite(previewReadyResult);
      setSteps(previewReadyResult.steps);
      return previewReadyResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setSteps((currentSteps) => [
        ...currentSteps.map((step) =>
          step.status === "running" ? { ...step, status: "failed" as const } : step
        ),
        { label: "Generation failed", detail: message, status: "failed" },
      ]);
      console.error("Website generation error:", err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [generatedWebsite?.chatId, pollForPreview]);

  return {
    generateWebsite,
    generatedWebsite,
    steps,
    isGenerating,
    error,
  };
}
