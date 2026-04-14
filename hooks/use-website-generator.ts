import { useState, useCallback } from "react";

export function useWebsiteGenerator() {
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateWebsite = useCallback(async (description: string) => {
    setIsGenerating(true);
    setError(null);
    setGeneratedCode("");

    try {
      const response = await fetch("/api/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) throw new Error("Generation failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      let fullCode = "";
      const decoder = new TextDecoder();

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullCode += chunk;
        setGeneratedCode(fullCode);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Website generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateWebsite,
    generatedCode,
    isGenerating,
    error,
  };
}
