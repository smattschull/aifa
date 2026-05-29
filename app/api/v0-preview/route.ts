import type { NextRequest } from "next/server";

const ALLOWED_HOST_SUFFIXES = [
  "v0.app",
  "v0.dev",
  "vercel.app",
  "vusercontent.net",
];

function isAllowedPreviewUrl(url: URL) {
  if (url.protocol !== "https:") return false;

  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`)
  );
}

function withBaseTag(html: string, sourceUrl: URL) {
  const baseTag = `<base href="${sourceUrl.href}">`;

  if (html.includes("<base")) return html;
  if (html.includes("<head>")) return html.replace("<head>", `<head>${baseTag}`);

  return `${baseTag}${html}`;
}

function withPreviewAssetUrls(html: string, sourceUrl: URL) {
  const rootRelativeAttributePattern =
    /\b(src|href|poster)=("|')\/(?!\/|#)([^"']*)\2/g;

  return html.replace(
    rootRelativeAttributePattern,
    (_match, attribute: string, quote: string, path: string) => {
      const absoluteUrl = new URL(`/${path}`, sourceUrl).href;

      return `${attribute}=${quote}${absoluteUrl}${quote}`;
    }
  );
}

function withInspectScript(html: string) {
  const inspectScript = String.raw`
<script>
(() => {
  let inspectMode = false;
  let highlightedElement = null;
  const outline = document.createElement("div");

  outline.style.cssText = [
    "position:fixed",
    "z-index:2147483647",
    "pointer-events:none",
    "border:2px solid #0ea5e9",
    "background:rgba(14,165,233,0.08)",
    "box-shadow:0 0 0 9999px rgba(2,6,23,0.08)",
    "display:none"
  ].join(";");

  function selectorFor(element) {
    if (!(element instanceof Element)) return "";
    if (element.id) return "#" + CSS.escape(element.id);

    const parts = [];
    let current = element;

    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      let part = current.nodeName.toLowerCase();
      const classNames = Array.from(current.classList || [])
        .filter(Boolean)
        .slice(0, 3);

      if (classNames.length > 0) {
        part += "." + classNames.map((name) => CSS.escape(name)).join(".");
      }

      const parent = current.parentElement;

      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (child) => child.nodeName === current.nodeName
        );

        if (siblings.length > 1) {
          part += ":nth-of-type(" + (siblings.indexOf(current) + 1) + ")";
        }
      }

      parts.unshift(part);
      current = parent;
    }

    return parts.join(" > ");
  }

  function updateOutline(element) {
    if (!inspectMode || !(element instanceof Element)) return;

    const rect = element.getBoundingClientRect();
    highlightedElement = element;
    outline.style.display = "block";
    outline.style.left = rect.left + "px";
    outline.style.top = rect.top + "px";
    outline.style.width = rect.width + "px";
    outline.style.height = rect.height + "px";
  }

  function clearOutline() {
    highlightedElement = null;
    outline.style.display = "none";
  }

  window.addEventListener("message", (event) => {
    if (event.data?.type !== "aifa-preview-inspect") return;

    inspectMode = Boolean(event.data.enabled);
    document.documentElement.style.cursor = inspectMode ? "crosshair" : "";

    if (!inspectMode) clearOutline();
  });

  document.addEventListener("mouseover", (event) => {
    if (!inspectMode) return;
    updateOutline(event.target);
  }, true);

  document.addEventListener("click", (event) => {
    if (!inspectMode) return;

    event.preventDefault();
    event.stopPropagation();

    const target = highlightedElement || event.target;
    const rect = target.getBoundingClientRect();

    window.parent.postMessage({
      type: "aifa-preview-element-selected",
      selector: selectorFor(target),
      tagName: target.nodeName.toLowerCase(),
      text: (target.innerText || target.textContent || "").trim().slice(0, 240),
      x: Math.round(((rect.left + rect.width / 2) / Math.max(window.innerWidth, 1)) * 100),
      y: Math.round(((rect.top + rect.height / 2) / Math.max(window.innerHeight, 1)) * 100)
    }, "*");

    inspectMode = false;
    document.documentElement.style.cursor = "";
    clearOutline();
  }, true);

  if (document.body) {
    document.body.appendChild(outline);
  } else {
    window.addEventListener("DOMContentLoaded", () => document.body.appendChild(outline), { once: true });
  }
})();
</script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${inspectScript}</body>`);
  }

  return `${html}${inspectScript}`;
}

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url");

  if (!source) {
    return new Response("Missing preview URL", { status: 400 });
  }

  let sourceUrl: URL;

  try {
    sourceUrl = new URL(source);
  } catch {
    return new Response("Invalid preview URL", { status: 400 });
  }

  if (!isAllowedPreviewUrl(sourceUrl)) {
    return new Response("Preview URL is not allowed", { status: 400 });
  }

  const upstream = await fetch(sourceUrl, {
    redirect: "follow",
    headers: {
      "User-Agent": "Aifa-v0-preview-proxy",
    },
    cache: "no-store",
  });

  const contentType = upstream.headers.get("content-type") ?? "text/html";

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text || "Unable to load v0 preview", {
      status: upstream.status,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (!contentType.includes("text/html")) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
      },
    });
  }

  const html = await upstream.text();
  const proxiedHtml = withInspectScript(
    withPreviewAssetUrls(withBaseTag(html, sourceUrl), sourceUrl)
  );

  return new Response(proxiedHtml, {
    status: upstream.status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
