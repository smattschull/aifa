// @/app/@right/(_server)/api/sections/read/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

interface ReadSectionsRequest {
  filePath: string;
}

interface ReadSectionsResponse {
  success: boolean;
  message: string;
  sections?: any[];
  source?: string;
  environment?: string;
}

// GitHub API configuration - обновленные пути
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_PAGES_BASE_PATH =
  process.env.GITHUB_PAGES_BASE_PATH || "app/@right/(_PAGES)"; // ✅ ОБНОВЛЕНО

/**
 * Автоматическое определение среды выполнения
 */
function detectEnvironment(): {
  isDevelopment: boolean;
  useLocal: boolean;
  reason: string;
} {
  const nodeEnv = process.env.NODE_ENV;
  const hasGitHubConfig = !!(GITHUB_TOKEN && GITHUB_REPO);

  // ✅ ОБНОВЛЕНО: проверяем новый путь к страницам
  const localPath = path.join(process.cwd(), "app", "@right", "(_PAGES)");
  let hasLocalFiles = false;

  try {
    const fs_sync = require("node:fs");
    const stats = fs_sync.statSync(localPath);
    hasLocalFiles = stats.isDirectory();
  } catch (error) {
    hasLocalFiles = false;
  }

  const isVercel = !!process.env.VERCEL;
  const isNetlify = !!process.env.NETLIFY;
  const isLocal =
    !isVercel &&
    !isNetlify &&
    (process.env.PWD?.includes("/Users/") ||
      process.env.PWD?.includes("/home/") ||
      process.env.USERPROFILE?.includes("\\Users\\") ||
      process.env.COMPUTERNAME ||
      !!process.env.USERNAME);

  if (nodeEnv === "development") {
    if (hasLocalFiles) {
      return {
        isDevelopment: true,
        useLocal: true,
        reason: "Development mode with local page files available",
      };
    } else if (hasGitHubConfig) {
      return {
        isDevelopment: true,
        useLocal: false,
        reason: "Development mode but no local page files, using GitHub",
      };
    }
  }

  if (nodeEnv === "production") {
    if (hasGitHubConfig) {
      return {
        isDevelopment: false,
        useLocal: false,
        reason: "Production mode with GitHub config",
      };
    } else if (hasLocalFiles && isLocal) {
      return {
        isDevelopment: false,
        useLocal: true,
        reason: "Production mode locally with local page files",
      };
    }
  }

  if (hasLocalFiles && isLocal) {
    return {
      isDevelopment: true,
      useLocal: true,
      reason: "Local environment detected with local page files",
    };
  }

  if (hasGitHubConfig && (isVercel || isNetlify)) {
    return {
      isDevelopment: false,
      useLocal: false,
      reason: "Cloud deployment detected with GitHub config",
    };
  }

  if (hasGitHubConfig) {
    return {
      isDevelopment: false,
      useLocal: false,
      reason: "Fallback to GitHub (only available option)",
    };
  }

  return {
    isDevelopment: true,
    useLocal: true,
    reason: "No valid config found, attempting local page files",
  };
}

/**
 * ✅ ОБНОВЛЕНО: Читает page.tsx файлы из новой структуры
 */
async function fetchFileContentFromLocal(filePath: string): Promise<string> {
  // ✅ НОВЫЙ ПУТЬ: app/@right/(_PAGES)/category/page/page.tsx
  const fullPath = path.join(
    process.cwd(),
    "app",
    "@right",
    "(_PAGES)",
    filePath,
    "page.tsx",
  );

  try {
    const content = await fs.readFile(fullPath, "utf-8");
    return content;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error("Page file not found in local filesystem");
    }
    throw error;
  }
}

/**
 * ✅ ОБНОВЛЕНО: Читает page.tsx файлы из GitHub
 */
async function fetchFileContentFromGitHub(filePath: string): Promise<string> {
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    throw new Error(
      "GitHub configuration missing: GITHUB_TOKEN and GITHUB_REPO are required",
    );
  }

  // ✅ НОВЫЙ ПУТЬ: app/@right/(_PAGES)/category/page/page.tsx
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PAGES_BASE_PATH}/${filePath}/page.tsx`;

  const response = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "NextJS-App",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Page file not found in GitHub repository");
    }
    if (response.status === 401) {
      throw new Error("GitHub authentication failed");
    }
    if (response.status === 403) {
      throw new Error(
        "GitHub API rate limit exceeded or insufficient permissions",
      );
    }

    const errorData = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();

  if (!data.content) {
    throw new Error("No content found in GitHub file response");
  }

  const buffer = Buffer.from(data.content, "base64");
  return buffer.toString("utf-8");
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ReadSectionsResponse>> {
  try {
    const body: ReadSectionsRequest = await request.json();
    const { filePath } = body;

    if (!filePath) {
      return NextResponse.json(
        {
          success: false,
          message: "File path is required",
        },
        { status: 400 },
      );
    }

    // Validate file path format (category/page)
    const pathRegex = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/;
    if (!pathRegex.test(filePath)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid file path format. Expected: category/page",
        },
        { status: 400 },
      );
    }

    const { isDevelopment, useLocal, reason } = detectEnvironment();

    console.log(
      `Environment Detection: ${reason} (Development: ${isDevelopment}, UseLocal: ${useLocal})`,
    );

    try {
      let fileContent: string;
      let source: string;

      if (useLocal) {
        console.log(`📁 Reading page from LOCAL filesystem: ${filePath}`);
        fileContent = await fetchFileContentFromLocal(filePath);
        source = "Local FileSystem";
      } else {
        console.log(`🔗 Reading page from GITHUB repository: ${filePath}`);
        fileContent = await fetchFileContentFromGitHub(filePath);
        source = "GitHub API";
      }

      // ✅ ОБНОВЛЕНО: Парсим sections из page.tsx файла
      const sectionsMatch = fileContent.match(
        /const sections = (\[[\s\S]*?\]);/,
      );

      if (!sectionsMatch) {
        console.warn(`No sections found in page file: ${filePath}`);
        return NextResponse.json({
          success: true,
          message: `No sections found in page file from ${source}`,
          sections: [],
          source,
          environment: `${process.env.NODE_ENV} (${reason})`,
        });
      }

      const sectionsCode = sectionsMatch[1];

      // ✅ БЕЗОПАСНОЕ ВЫПОЛНЕНИЕ: используем Function constructor вместо eval
      let sections: any[];
      try {
        sections = new Function(`return ${sectionsCode}`)();
      } catch (evalError) {
        console.error("Error parsing sections:", evalError);
        return NextResponse.json(
          {
            success: false,
            message:
              "Could not parse sections from page file - invalid JavaScript",
            source,
            environment: `${process.env.NODE_ENV} (${reason})`,
          },
          { status: 500 },
        );
      }

      // ✅ ВАЛИДАЦИЯ: проверяем что sections это массив
      if (!Array.isArray(sections)) {
        return NextResponse.json(
          {
            success: false,
            message: "Sections data is not an array",
            source,
            environment: `${process.env.NODE_ENV} (${reason})`,
          },
          { status: 500 },
        );
      }

      console.log(
        `✅ Successfully parsed ${sections.length} sections from ${source}`,
      );

      return NextResponse.json({
        success: true,
        message: `Sections loaded successfully from ${source}`,
        sections,
        source,
        environment: `${process.env.NODE_ENV} (${reason})`,
      });
    } catch (fetchError: any) {
      const source = useLocal ? "Local FileSystem" : "GitHub API";

      if (fetchError.message.includes("not found")) {
        console.warn(`Page file not found: ${filePath}`);
        return NextResponse.json({
          success: true,
          message: `No page file found in ${source}`,
          sections: [],
          source,
          environment: `${process.env.NODE_ENV} (${reason})`,
        });
      }

      console.error(`Error fetching from ${source}:`, fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error("Error reading page sections:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
        environment: process.env.NODE_ENV,
      },
      { status: 500 },
    );
  }
}
