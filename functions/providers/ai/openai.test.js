const test = require("node:test");
const assert = require("node:assert/strict");
const { parseSseBlock } = require("./openai");

test("parses an OpenAI streaming event", () => {
  const event = parseSseBlock([
    "event: response.output_text.delta",
    `data: ${JSON.stringify({ type: "response.output_text.delta", delta: "Hello" })}`,
  ].join("\n"));

  assert.equal(event.type, "response.output_text.delta");
  assert.equal(event.delta, "Hello");
});
