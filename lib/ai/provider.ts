// ============================================================================
// RiskShield AI — LLM Provider Abstraction
// ----------------------------------------------------------------------------
// A tiny, deliberately boring abstraction: every provider just turns a
// (systemPrompt, userPrompt) pair into a text response. Swapping providers
// is an environment-variable change, not a code change.
//
//   AI_PROVIDER=openai      -> uses OPENAI_API_KEY-style key via AI_API_KEY
//   AI_PROVIDER=anthropic   -> uses Anthropic's Messages API
//   AI_PROVIDER=none / unset -> no provider is configured; callers must
//                               fall back to the deterministic templates.
//
// No API key is ever hard-coded. If AI_API_KEY is missing, isConfigured is
// false and the app is expected to use the fallback path — it must never crash.
// ============================================================================

import type { AIProvider } from "./types";

class OpenAIProvider implements AIProvider {
  name = "openai";
  private apiKey = process.env.AI_API_KEY || "";
  private model = process.env.AI_MODEL || "gpt-4o-mini";

  get isConfigured() {
    return this.apiKey.length > 0;
  }

  async generateJSON(systemPrompt: string, userPrompt: string): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI request failed (${res.status}): ${text}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("OpenAI response missing content");
    return content;
  }
}

class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private apiKey = process.env.AI_API_KEY || "";
  private model = process.env.AI_MODEL || "claude-sonnet-4-6";

  get isConfigured() {
    return this.apiKey.length > 0;
  }

  async generateJSON(systemPrompt: string, userPrompt: string): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Anthropic request failed (${res.status}): ${text}`);
    }
    const data = await res.json();
    const textBlock = data?.content?.find((c: any) => c.type === "text");
    if (!textBlock?.text) throw new Error("Anthropic response missing text content");
    return textBlock.text as string;
  }
}

class UnconfiguredProvider implements AIProvider {
  name = "none";
  isConfigured = false;
  async generateJSON(): Promise<string> {
    throw new Error("No AI provider is configured (AI_PROVIDER/AI_API_KEY not set)");
  }
}

export function getAIProvider(): AIProvider {
  const providerName = (process.env.AI_PROVIDER || "none").toLowerCase();
  switch (providerName) {
    case "openai":
      return new OpenAIProvider();
    case "anthropic":
      return new AnthropicProvider();
    default:
      return new UnconfiguredProvider();
  }
}

export function getAIProviderStatus(): { provider: string; configured: boolean; model: string | null } {
  const provider = getAIProvider();
  return {
    provider: provider.name,
    configured: provider.isConfigured,
    model: provider.isConfigured ? process.env.AI_MODEL || "(provider default)" : null,
  };
}
