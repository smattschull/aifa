import { auth } from "@/app/@left/(_public)/(_AUTH)/(_service)/(_actions)/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new Response("chatId is required", { status: 400 });
  }

  const session = await auth();

  if (!session?.user?.email || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  if (chat.userId !== session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const votes = await prisma.vote.findMany({
    where: { chatId },
  });

  return Response.json(votes);
}

export async function PATCH(request: Request) {
  const { chatId, messageId, type } = (await request.json()) as {
    chatId?: string;
    messageId?: string;
    type?: "up" | "down";
  };

  if (!chatId || !messageId || !type) {
    return new Response("chatId, messageId and type are required", {
      status: 400,
    });
  }

  const session = await auth();

  if (!session?.user?.email || !session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
  });

  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  if (chat.userId !== session.user.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  await prisma.vote.upsert({
    where: {
      chatId_messageId: {
        chatId,
        messageId,
      },
    },
    update: {
      isUpvoted: type === "up",
    },
    create: {
      chatId,
      messageId,
      isUpvoted: type === "up",
    },
  });

  return new Response("Message voted", { status: 200 });
}
