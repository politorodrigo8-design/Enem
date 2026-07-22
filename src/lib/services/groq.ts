import "server-only";

const GROQ_CHAT_COMPLETIONS_URL =
  process.env.GROQ_CHAT_COMPLETIONS_URL ??
  "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GroqChatCompletionPayload = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

export type GroqTextResult = {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export class GroqConfigurationError extends Error {
  constructor() {
    super("Configure GROQ_API_KEY no ambiente para habilitar a IA.");
  }
}

export class GroqGenerationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function isGroqConfigured() {
  return Boolean(getGroqApiKey());
}

export async function generateGroqText({
  messages,
  maxCompletionTokens = 900,
  temperature = 0.35,
  timeoutMs = 30_000,
}: {
  messages: GroqMessage[];
  maxCompletionTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<GroqTextResult> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    throw new GroqConfigurationError();
  }

  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: maxCompletionTokens,
        temperature,
        stream: false,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => ({}))) as GroqChatCompletionPayload;
    if (!response.ok) {
      throw new GroqGenerationError(
        payload.error?.message || `Groq respondeu com status ${response.status}.`,
      );
    }

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new GroqGenerationError("A Groq nao retornou texto para esta solicitacao.");
    }

    return {
      content,
      model: payload.model || model,
      usage: payload.usage
        ? {
            promptTokens: payload.usage.prompt_tokens,
            completionTokens: payload.usage.completion_tokens,
            totalTokens: payload.usage.total_tokens,
          }
        : undefined,
    };
  } catch (error) {
    if (error instanceof GroqGenerationError || error instanceof GroqConfigurationError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new GroqGenerationError("A chamada para a Groq demorou demais. Tente novamente.");
    }

    throw new GroqGenerationError(
      error instanceof Error ? error.message : "Nao foi possivel chamar a Groq.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function getGroqApiKey() {
  return process.env.GROQ_API_KEY?.trim() || process.env.AI_PROVIDER_API_KEY?.trim() || "";
}
