import { openai } from "@ai-sdk/openai";
import { generateObject, streamText } from "ai";
import { z } from "zod";

const websiteSchema = z.object({
  html: z.string().describe("Clean, production-ready HTML code"),
  tailwindCSS: z.string().describe("Tailwind CSS classes used"),
  reactCode: z.string().describe("React component code"),
  description: z.string().describe("Component description"),
  features: z.array(z.string()).describe("Key features of the design"),
});

export async function generateWebsiteFromDescription(userDescription: string) {
  try {
    const result = await generateObject({
      model: openai("gpt-4-turbo"),
      system: `You are an expert web designer and React developer. Generate beautiful, modern, responsive websites based on user descriptions. 
      
      Rules:
      - Use Tailwind CSS for styling
      - Make it mobile-responsive
      - Use semantic HTML
      - Include interactive elements
      - Ensure accessibility (WCAG 2.1)
      - Return valid, production-ready code`,
      prompt: `Create a website component based on this description: ${userDescription}`,
      schema: websiteSchema,
    });

    return result.object;
  } catch (error) {
    console.error("Website generation failed:", error);
    throw new Error("Failed to generate website");
  }
}

export async function streamWebsiteGeneration(userDescription: string) {
  const stream = await streamText({
    model: openai("gpt-4-turbo"),
    system: `Generate React component code for a website. Return ONLY valid JSX/TSX code wrapped in a React component. Use Tailwind CSS for styling.`,
    prompt: userDescription,
  });

  return stream;
}
