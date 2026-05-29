"use client";

import { useEffect, useRef } from "react";

export interface PreviewElementSelection {
  selector: string;
  tagName: string;
  text: string;
  x: number;
  y: number;
}

interface WebsitePreviewProps {
  html?: string;
  src?: string;
  screenshotSrc?: string;
  isLoading?: boolean;
  error?: string | null;
  hasGeneratedFiles?: boolean;
  inspectMode?: boolean;
  onElementSelected?: (selection: PreviewElementSelection) => void;
}

export function WebsitePreview({
  html,
  src,
  screenshotSrc,
  isLoading,
  error,
  hasGeneratedFiles,
  inspectMode = false,
  onElementSelected,
}: WebsitePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    iframeRef.current.contentWindow?.postMessage(
      { type: "aifa-preview-inspect", enabled: inspectMode },
      "*"
    );
  }, [inspectMode, src, html]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== "aifa-preview-element-selected") return;

      onElementSelected?.({
        selector: String(event.data.selector ?? ""),
        tagName: String(event.data.tagName ?? ""),
        text: String(event.data.text ?? ""),
        x: Number(event.data.x ?? 0),
        y: Number(event.data.y ?? 0),
      });
    };

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [onElementSelected]);

  if (isLoading && !html && !src && !screenshotSrc) {
    return (
      <div className="flex h-full items-center justify-center bg-white p-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="mt-4 text-sm font-medium text-gray-900">
            Preparing v0 preview
          </p>
          <p className="mt-1 text-xs text-gray-500">
            v0 has generated files and is publishing the live preview URL.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-red-50 p-4">
        <div className="text-center text-red-600">
          <p className="font-semibold">Website generation failed</p>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!html && !src && screenshotSrc) {
    return (
      <div className="h-full w-full overflow-auto bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- v0 screenshot hosts are dynamic and used only as a fallback. */}
        <img
          src={screenshotSrc}
          alt="Generated website screenshot"
          className="min-h-full w-full object-contain"
        />
        <div className="sticky bottom-0 border-t bg-white/95 px-4 py-2 text-xs text-gray-600 backdrop-blur">
          v0 has not returned a live preview URL yet, so this screenshot is
          shown as a fallback.
        </div>
      </div>
    );
  }

  if (!html && !src) {
    return (
      <div className="flex h-full items-center justify-center bg-white p-6 text-center">
        <div>
          <p className="text-sm font-medium text-gray-900">
            Preview URL unavailable
          </p>
          <p className="mt-2 max-w-md text-xs text-gray-500">
            {hasGeneratedFiles
              ? "v0 generated files, but did not expose a live preview or deployment URL for this chat yet."
              : "v0 has not returned a preview URL yet."}
          </p>
        </div>
      </div>
    );
  }

  const iframeProps = html ? { srcDoc: html } : { src };

  return (
    <iframe
      ref={iframeRef}
      title="Generated website preview"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      className="h-full w-full border-0 bg-white"
      onLoad={() => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "aifa-preview-inspect", enabled: inspectMode },
          "*"
        );
      }}
      {...iframeProps}
    />
  );
}
