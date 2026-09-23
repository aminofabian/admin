/**
 * Thin JevAI Community client (judgment layer only).
 * Base: https://www.jevai.org — never hardcode API keys.
 */

const JEV_BASE_URL = 'https://www.jevai.org';
const DEFAULT_TIMEOUT_MS = 15_000;

export type JevEnvelope<T> = {
  code: number;
  message: string;
  data: T | null;
};

export type JevPresetResult = {
  decision: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  guidance?: string;
  guidance_source?: string;
  answers?: Record<string, unknown>;
};

export type ToolGuardInput = {
  tool: string;
  action: string;
  arguments_summary?: string[];
  side_effects?: string[];
  safeguards?: string[];
  policy?: string[];
  reversibility?: string;
};

export type RouteTaskInput = {
  task: string;
  evidence?: string[];
  constraints?: string[];
};

export type CheckResearchInput = {
  claim: string;
  evidence?: string[];
  source_quality?: string;
  stakes?: string;
};

export type ReviewCompletionInput = {
  objective: string;
  completed_work?: string[];
  verification?: string[];
  known_gaps?: string[];
};

export type RouteModelInput = {
  task: string;
  candidates: Array<{
    id: string;
    description: string;
    cost?: string;
    latency?: string;
  }>;
  priorities?: string[];
  constraints?: string[];
  stakes?: string;
};

export type DecideInput = {
  state: Record<string, unknown> | string;
  questions: Record<string, unknown>;
  model?: string;
};

export class JevError extends Error {
  readonly code: number;
  readonly status?: number;

  constructor(message: string, code: number, status?: number) {
    super(message);
    this.name = 'JevError';
    this.code = code;
    this.status = status;
  }
}

function getApiKey(): string | undefined {
  const key = process.env.JEV_API_KEY?.trim();
  return key || undefined;
}

export function isJevConfigured(): boolean {
  return Boolean(getApiKey());
}

async function postJev<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new JevError(
      'JEV_API_KEY is not set. Create a key at https://www.jevai.org/agent/keys',
      -1
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${JEV_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    let envelope: JevEnvelope<T>;
    try {
      envelope = (await response.json()) as JevEnvelope<T>;
    } catch {
      throw new JevError(
        `Jev returned non-JSON (HTTP ${response.status})`,
        -1,
        response.status
      );
    }

    if (!response.ok || envelope.code !== 0 || envelope.data == null) {
      throw new JevError(
        envelope.message || `Jev request failed (HTTP ${response.status})`,
        envelope.code ?? -1,
        response.status
      );
    }

    return envelope.data;
  } finally {
    clearTimeout(timer);
  }
}

/** Guard a consequential tool call. Does not execute the tool. */
export function toolGuard(input: ToolGuardInput): Promise<JevPresetResult> {
  return postJev<JevPresetResult>('/api/v1/decisions/tool-guard', { ...input });
}

/** Route an ambiguous or risky task path. */
export function routeTask(input: RouteTaskInput): Promise<JevPresetResult> {
  return postJev<JevPresetResult>('/api/v1/decisions/route', { ...input });
}

/** Check whether evidence supports one claim (no browse). */
export function checkResearch(
  input: CheckResearchInput
): Promise<JevPresetResult> {
  return postJev<JevPresetResult>('/api/v1/decisions/research', { ...input });
}

/** Review whether an objective is actually complete. */
export function reviewCompletion(
  input: ReviewCompletionInput
): Promise<JevPresetResult> {
  return postJev<JevPresetResult>('/api/v1/decisions/completion', { ...input });
}

/** Pick among invocable models the environment can actually run. */
export function routeModel(input: RouteModelInput): Promise<JevPresetResult> {
  return postJev<JevPresetResult>('/api/v1/decisions/model-route', {
    ...input,
  });
}

/** Custom state + typed questions (choice / score / noul). */
export function decide(input: DecideInput): Promise<JevPresetResult> {
  return postJev<JevPresetResult>('/api/v1/decisions', { ...input });
}
