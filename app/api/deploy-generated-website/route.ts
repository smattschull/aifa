import { v0 } from "v0-sdk";
import type { ChatDetail, ProjectDetail } from "v0-sdk";

class DeploySetupError extends Error {
  constructor(
    message: string,
    public status = 409
  ) {
    super(message);
  }
}

function getProjectName(chat: ChatDetail) {
  return chat.name ?? chat.title ?? `aifa-generated-${chat.id}`;
}

async function getDeployableProject(chat: ChatDetail): Promise<ProjectDetail> {
  const currentProject =
    chat.projectId !== undefined
      ? await v0.projects.getById({ projectId: chat.projectId })
      : await v0.projects.getByChatId({ chatId: chat.id });

  if (currentProject.vercelProjectId) {
    return currentProject;
  }

  const vercelProjectId = process.env.VERCEL_PROJECT_ID;

  if (!vercelProjectId) {
    throw new DeploySetupError(
      "Project has no Vercel project ID. Add VERCEL_PROJECT_ID to .env or connect this v0 project to Vercel in v0.app."
    );
  }

  try {
    await v0.integrations.vercel.projects.create({
      projectId: vercelProjectId,
      name: getProjectName(chat),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.includes("HTTP 403")) {
      throw new DeploySetupError(
        "v0 cannot connect this Vercel project automatically. The V0_API_KEY is missing Vercel integration permission or belongs to a different team. Connect the v0 project to Vercel manually in v0.app, or create a V0_API_KEY from the same Vercel/v0 team.",
        403
      );
    }

    if (!message.toLowerCase().includes("already")) {
      console.warn("Unable to pre-register Vercel project in v0", error);
    }
  }

  const linkedProject = await v0.projects.create({
    name: getProjectName(chat),
    vercelProjectId,
    privacy: currentProject.privacy,
  });

  await v0.projects.assign({
    projectId: linkedProject.id,
    chatId: chat.id,
  });

  return linkedProject;
}

export async function POST(request: Request) {
  const { chatId } = (await request.json()) as {
    chatId?: string;
  };

  if (!chatId) {
    return new Response("chatId required", { status: 400 });
  }

  if (!process.env.V0_API_KEY) {
    return new Response("Missing V0_API_KEY in environment", { status: 500 });
  }

  try {
    const chat = await v0.chats.getById({ chatId });
    const version = chat.latestVersion;

    if (!version?.id) {
      return new Response("No v0 version available for this chat", {
        status: 400,
      });
    }

    if (version.status !== "completed") {
      return new Response("The latest v0 version is not completed yet", {
        status: 409,
      });
    }

    const project = await getDeployableProject(chat);

    const deployment = await v0.deployments.create({
      projectId: project.id,
      chatId: chat.id,
      versionId: version.id,
    });

    return Response.json({
      deploymentId: deployment.id,
      deploymentUrl: deployment.webUrl,
      inspectorUrl: deployment.inspectorUrl,
      chatId: deployment.chatId,
      projectId: deployment.projectId,
      versionId: deployment.versionId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to deploy v0 website";

    return new Response(message, {
      status: error instanceof DeploySetupError ? error.status : 502,
    });
  }
}
