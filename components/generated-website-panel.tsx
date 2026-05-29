"use client";

import { WebsitePreview } from "@/components/website-preview";
import type { PreviewElementSelection } from "@/components/website-preview";
import { useAppContext } from "@/contexts/app-context";
import type { GeneratedWebsiteResult } from "@/hooks/use-website-generator";
import {
  Crosshair,
  ExternalLink,
  Loader2,
  MousePointer2,
  Rocket,
  Send,
} from "lucide-react";
import {
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useState,
} from "react";

function toPreviewSrc(url: string) {
  if (!url) return "";

  return url;
}

export function GeneratedWebsitePanel({
  children,
}: {
  children: ReactNode;
}) {
  const {
    generatedWebsiteHtml,
    generatedWebsiteUrl,
    generatedWebsiteScreenshotUrl,
    generatedWebsiteHasFiles,
    generatedWebsiteChatId,
    isGeneratingWebsite,
    websiteGenerationError,
    setGeneratedWebsiteState,
  } = useAppContext();
  const [editPrompt, setEditPrompt] = useState("");
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [selectedElement, setSelectedElement] =
    useState<PreviewElementSelection | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [deploymentUrl, setDeploymentUrl] = useState("");

  const hasGeneratedWebsite =
    generatedWebsiteHtml ||
    generatedWebsiteUrl ||
    generatedWebsiteScreenshotUrl ||
    isGeneratingWebsite ||
    websiteGenerationError;

  const handleSelectPoint = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedPoint({
      x: Math.round(((event.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((event.clientY - rect.top) / rect.height) * 100),
    });
    setSelectedElement(null);
    setIsSelecting(false);
  };

  const handleElementSelected = useCallback(
    (selection: PreviewElementSelection) => {
      setSelectedElement(selection);
      setSelectedPoint({ x: selection.x, y: selection.y });
      setIsSelecting(false);
    },
    []
  );

  const handleRefine = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editPrompt.trim() || !generatedWebsiteChatId) return;

    setIsEditing(true);
    setEditError(null);
    setDeployError(null);
    setDeploymentUrl("");

    const positionContext = selectedElement
      ? `The user selected this element in the live preview:
- CSS selector: ${selectedElement.selector}
- HTML tag: ${selectedElement.tagName}
- Visible text: ${selectedElement.text || "No visible text"}
- Visual position: ${selectedElement.x}% from the left and ${selectedElement.y}% from the top.`
      : selectedPoint
        ? `The user selected the visual area around ${selectedPoint.x}% from the left and ${selectedPoint.y}% from the top of the preview.`
        : "No exact visual element was selected.";

    try {
      const response = await fetch("/api/generate-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: generatedWebsiteChatId,
          description: `${positionContext}\n\nApply this edit: ${editPrompt}`,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "v0 edit failed");
      }

      const result = (await response.json()) as GeneratedWebsiteResult;
      setGeneratedWebsiteState({
        html: "",
        url: result.rawDemoUrl ?? result.demoUrl ?? "",
        screenshotUrl: result.screenshotUrl ?? "",
        v0Url: result.webUrl,
        chatId: result.chatId,
        isGenerating: false,
        error: null,
      });
      setEditPrompt("");
      setSelectedPoint(null);
      setSelectedElement(null);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "v0 edit failed");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeploy = async () => {
    if (!generatedWebsiteChatId) return;

    setIsDeploying(true);
    setDeployError(null);

    try {
      const response = await fetch("/api/deploy-generated-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: generatedWebsiteChatId }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Deployment failed");
      }

      const result = (await response.json()) as {
        deploymentUrl?: string;
      };

      setDeploymentUrl(result.deploymentUrl ?? "");
    } catch (error) {
      setDeployError(error instanceof Error ? error.message : "Deployment failed");
    } finally {
      setIsDeploying(false);
    }
  };

  if (!hasGeneratedWebsite) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      <div className="border-b border-border px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              v0 generated website
            </p>
            <p className="text-xs text-muted-foreground">
              Preview and refine the current v0 chat
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {deploymentUrl && (
              <a
                href={deploymentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-500/10"
              >
                <ExternalLink className="size-3.5" />
                Live öffnen
              </a>
            )}
            <button
              type="button"
              onClick={handleDeploy}
              disabled={!generatedWebsiteChatId || isDeploying || isEditing}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeploying ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Rocket className="size-3.5" />
              )}
              {isDeploying ? "Publiziert..." : "Publizieren"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSelecting((current) => !current);
                setEditError(null);
              }}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Crosshair className="size-3.5" />
              {isSelecting ? "Cancel select" : "Select area"}
            </button>
          </div>
        </div>
        {deployError && (
          <p className="mt-2 text-xs text-destructive">{deployError}</p>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <WebsitePreview
          html={generatedWebsiteHtml}
          src={toPreviewSrc(generatedWebsiteUrl)}
          screenshotSrc={generatedWebsiteScreenshotUrl}
          hasGeneratedFiles={generatedWebsiteHasFiles}
          isLoading={isGeneratingWebsite || isEditing}
          error={websiteGenerationError}
          inspectMode={isSelecting}
          onElementSelected={handleElementSelected}
        />
        {isSelecting && (
          <button
            type="button"
            aria-label="Select preview area"
            onClick={handleSelectPoint}
            className="absolute inset-0 z-10 cursor-crosshair bg-sky-500/10"
          />
        )}
        {selectedPoint && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-500 bg-background p-1 shadow"
            style={{ left: `${selectedPoint.x}%`, top: `${selectedPoint.y}%` }}
          >
            <MousePointer2 className="size-4 text-sky-500" />
          </div>
        )}
        {selectedElement && (
          <div className="pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-1.5rem)] rounded-md border border-sky-200 bg-background/95 px-3 py-2 text-xs text-foreground shadow backdrop-blur">
            <span className="font-medium">{selectedElement.tagName}</span>
            <span className="ml-2 text-muted-foreground">
              {selectedElement.selector}
            </span>
          </div>
        )}
      </div>

      <form
        onSubmit={handleRefine}
        className="border-t border-border bg-background p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={editPrompt}
            onChange={(event) => setEditPrompt(event.target.value)}
            placeholder={
              selectedElement
                ? "Describe how v0 should edit the selected element..."
                : selectedPoint
                  ? "Describe how v0 should edit the selected area..."
                : "Describe what v0 should change..."
            }
            className="min-h-12 flex-1 resize-none rounded-md border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            rows={2}
          />
          <button
            type="submit"
            disabled={!editPrompt.trim() || !generatedWebsiteChatId || isEditing}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEditing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>
        {editError && (
          <p className="mt-2 text-xs text-destructive">{editError}</p>
        )}
      </form>
    </div>
  );
}
