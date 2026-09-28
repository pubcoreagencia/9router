import { describe, expect, it } from "vitest";

import "../translator/registerAll.js";
import { FORMATS } from "../../open-sse/translator/formats.js";
import { normalizeToolCallArguments, ensureToolCallIds } from "../../open-sse/translator/concerns/toolCall.js";
import { translateRequest } from "../../open-sse/translator/index.js";

describe("tool-call arguments normalization", () => {
  it("converts object arguments to a JSON object string", () => {
    expect(normalizeToolCallArguments({ path: "index.html" }))
      .toBe('{"path":"index.html"}');
  });

  it("canonicalizes valid JSON object strings", () => {
    expect(normalizeToolCallArguments('{ "path": "index.html" }'))
      .toBe('{"path":"index.html"}');
  });

  it("replaces truncated JSON with a valid empty object", () => {
    const malformed = '{"path":"index.html","content":';
    const normalized = normalizeToolCallArguments(malformed);

    expect(normalized).toBe("{}");
    expect(() => JSON.parse(normalized)).not.toThrow();
    expect(JSON.parse(normalized)).toEqual({});
  });

  it("requires an object, not a JSON array or primitive", () => {
    expect(normalizeToolCallArguments("[]")).toBe("{}");
    expect(normalizeToolCallArguments('"text"')).toBe("{}");
    expect(normalizeToolCallArguments("null")).toBe("{}");
  });

  it("sanitizes assistant tool-call history before OpenAI-compatible dispatch", () => {
    const body = {
      model: "nvidia/test",
      messages: [{
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "call_bad",
          type: "function",
          function: {
            name: "write_file",
            arguments: '{"path":"index.html","content":',
          },
        }],
      }],
      tools: [],
    };

    ensureToolCallIds(body);

    const args = body.messages[0].tool_calls[0].function.arguments;
    expect(args).toBe("{}");
    expect(() => JSON.parse(args)).not.toThrow();
  });

  it("keeps sanitized history valid through translateRequest", () => {
    const body = {
      model: "nvidia/test",
      messages: [{
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "call_bad",
          type: "function",
          function: {
            name: "write_file",
            arguments: '{"path":"index.html","content":',
          },
        }],
      }],
    };

    const result = translateRequest(
      FORMATS.OPENAI,
      FORMATS.OPENAI,
      "nvidia/test",
      body,
      false,
      null,
      "nvidia",
    );

    const args = result.messages[0].tool_calls[0].function.arguments;
    expect(args).toBe("{}");
    expect(() => JSON.parse(args)).not.toThrow();
    expect(JSON.parse(args)).toEqual({});
  });
});
