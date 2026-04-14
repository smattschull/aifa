import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { description } = await request.json();

  if (!description) {
    return new Response("Description required", { status: 400 });
  }

  const stream = streamText({
    model: openai("gpt-4-turbo"),
    system: `You are a world-class web designer and React expert. Generate beautiful, modern, responsive website components.
    
    Important rules:
    - Return ONLY valid React/JSX code
    - Use Tailwind CSS classes for all styling
    - Make it fully responsive
    - Include interactive elements using React hooks
    - No markdown, no explanations, pure code only
    - Wrap in a default export function component
    - Use shadcn/ui components when appropriate`,
    prompt: `Generate a React component for: ${description}`,
  });

  return stream.toTextStreamResponse();
}
