export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export class LlmConfigError extends Error {
  status = 503;

  constructor(message: string) {
    super(message);
    this.name = 'LlmConfigError';
  }
}

export class LlmRequestError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'LlmRequestError';
    this.status = status;
  }
}

function getLlmConfig() {
  const apiKey = process.env.TEXT_API_KEY?.trim();
  const baseUrl = process.env.TEXT_BASE_URL?.trim().replace(/\/$/, '');
  const model = process.env.TEXT_MODEL?.trim();

  if (!apiKey || !baseUrl || !model) {
    throw new LlmConfigError('TEXT_API_KEY, TEXT_BASE_URL, and TEXT_MODEL must be configured');
  }

  return { apiKey, baseUrl, model };
}

export async function chatWithLlm(options: {
  system?: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const { apiKey, baseUrl, model } = getLlmConfig();
  const messages: ChatMessage[] = options.system
    ? [{ role: 'system', content: options.system }, ...options.messages]
    : options.messages;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new LlmRequestError(`LLM API error ${res.status}: ${err.slice(0, 300)}`, res.status);
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new LlmRequestError('LLM returned empty content');
  }

  return content;
}
