import type { NextRequest } from "next/server";
import { v0 } from "v0-sdk";
import type { ChatDetail, DeploymentDetail } from "v0-sdk";

const V0_WEBSITE_SYSTEM_PROMPT = `You are v0, acting as a senior product designer and production Next.js engineer.

Create a production-ready website, not a rough outline. Use:
- Next.js App Router with React and TypeScript
- Tailwind CSS
- shadcn/ui-style primitives and lucide-react icons when useful
- Responsive layouts for mobile, tablet, and desktop
- Realistic sections, content hierarchy, empty/error/loading states where relevant
- Polished visual design with consistent spacing, accessible contrast, and keyboard-friendly controls

Return a working project/page that can be previewed in v0. Avoid placeholder-only wireframes unless the user explicitly asks for a wireframe.`;

async function waitForCompletedChat(chat: ChatDetail) {
  let currentChat = chat;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (
      currentChat.latestVersion?.status === "completed" &&
      currentChat.latestVersion.demoUrl
    ) {
      return currentChat;
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
    currentChat = await v0.chats.getById({ chatId: chat.id });
  }

  return currentChat;
}

async function createDeploymentPreview(chat: ChatDetail) {
  const version = chat.latestVersion;

  if (!version?.id) return null;

  try {
    const project =
      chat.projectId !== undefined
        ? { id: chat.projectId }
        : await v0.projects.getByChatId({ chatId: chat.id });

    return await v0.deployments.create({
      projectId: project.id,
      chatId: chat.id,
      versionId: version.id,
    });
  } catch (error) {
    console.warn("Unable to create v0 deployment preview", error);
    return null;
  }
}

function createSteps(chat: ChatDetail) {
  const version = chat.latestVersion;
  const assistantMessage = [...chat.messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const files = version?.files ?? [];
  const assistantLines =
    assistantMessage?.content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 8) ?? [];

  return [
    {
      label: "Thought",
      detail: "v0 planned the implementation",
      status: "done" as const,
    },
    {
      label: "Design inspiration ready",
      detail: "Layout, tone, and visual direction selected",
      status: "done" as const,
    },
    {
      label: `Explore - ${files.length} files`,
      detail: files.map((file) => file.name).join(", "),
      status: "done" as const,
    },
    ...assistantLines.map((line) => ({
      label: line,
      status: "done" as const,
    })),
    ...files.slice(0, 10).map((file) => ({
      label: `${file.name} updated`,
      status: "done" as const,
    })),
  ];
}

function toGenerationResponse(
  chat: ChatDetail,
  deploymentPreview: DeploymentDetail | null = null
) {
  const version = chat.latestVersion;
  const previewUrl = version?.demoUrl ?? deploymentPreview?.webUrl;
  const assistantText =
    [...chat.messages].reverse().find((message) => message.role === "assistant")
      ?.content ?? "";

  return {
    chatId: chat.id,
    versionId: version?.id,
    demoUrl: previewUrl,
    rawDemoUrl: previewUrl,
    screenshotUrl: version?.screenshotUrl,
    deploymentUrl: deploymentPreview?.webUrl,
    webUrl: chat.webUrl,
    status: version?.status,
    assistantText,
    steps: createSteps(chat),
    files:
      version?.files.map((file) => ({
        name: file.name,
        content: file.content,
      })) ?? [],
  };
}

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get("chatId");

  if (!chatId) {
    return new Response("chatId required", { status: 400 });
  }

  if (!process.env.V0_API_KEY) {
    return new Response("Missing V0_API_KEY in environment", { status: 500 });
  }

  try {
    const chat = await v0.chats.getById({ chatId });
    const deploymentPreview = chat.latestVersion?.demoUrl
      ? null
      : await createDeploymentPreview(chat);

    return Response.json(toGenerationResponse(chat, deploymentPreview));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to fetch v0 chat";

    return new Response(message, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const { description, chatId } = await request.json();

  if (!description) {
    return new Response("Description required", { status: 400 });
  }

  if (!process.env.V0_API_KEY) {
    return new Response("Missing V0_API_KEY in environment", { status: 500 });
  }

  const message = `Create or update a production-ready website for this request:

${description}

Make it feel complete enough to show to a client: real layout, polished copy, responsive navigation, strong first screen, meaningful sections, and clean implementation.`;

  try {
    const chat = chatId
      ? await v0.chats.sendMessage({
          chatId,
          message,
          system: V0_WEBSITE_SYSTEM_PROMPT,
          responseMode: "sync",
          modelConfiguration: {
            modelId: "v0-max",
            imageGenerations: true,
            thinking: true,
          },
        })
      : await v0.chats.create({
          message,
          system: V0_WEBSITE_SYSTEM_PROMPT,
          chatPrivacy: "private",
          responseMode: "sync",
          modelConfiguration: {
            modelId: "v0-max",
            imageGenerations: true,
            thinking: true,
          },
        });

    if (chat instanceof ReadableStream) {
      return new Response("Unexpected v0 streaming response", { status: 500 });
    }

    const completedChat = await waitForCompletedChat(chat);
    const deploymentPreview = completedChat.latestVersion?.demoUrl
      ? null
      : await createDeploymentPreview(completedChat);

    return Response.json(toGenerationResponse(completedChat, deploymentPreview));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to generate with v0";

    return new Response(message, { status: 502 });
  }
}
