const axios = require("axios");
const { OPENAI_API_KEY } = require("../../env");

async function generateJson({
  system,
  prompt,
  schema,
  schemaName = "webilo_response",
  images = [],
  model = "gpt-5.4-mini",
}) {
  const content = [
    { type: "text", text: prompt },
    ...images.map((imageUrl) => ({
      type: "image_url",
      image_url: { url: imageUrl, detail: "high" },
    })),
  ];

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content },
      ],
      response_format: schema
        ? {
            type: "json_schema",
            json_schema: {
              name: schemaName,
              strict: true,
              schema,
            },
          }
        : { type: "json_object" },
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY.value()}`,
        "Content-Type": "application/json",
      },
      timeout: 90000,
    }
  );

  const output = response.data?.choices?.[0]?.message?.content;
  if (!output) throw new Error("OpenAI returned an empty response.");
  const parsed = JSON.parse(output);
  Object.defineProperty(parsed, "__usage", {
    value: {
      inputTokens: Number(response.data?.usage?.prompt_tokens || 0),
      outputTokens: Number(response.data?.usage?.completion_tokens || 0),
    },
    enumerable: false,
  });
  return parsed;
}

function parseSseBlock(block) {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("");
  if (!data || data === "[DONE]") return null;
  return JSON.parse(data);
}

async function streamText({
  system,
  prompt,
  model = "gpt-5.4-mini",
  maxOutputTokens = 900,
  onDelta,
}) {
  const response = await axios.post(
    "https://api.openai.com/v1/responses",
    {
      model,
      instructions: system,
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
      max_output_tokens: maxOutputTokens,
      stream: true,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY.value()}`,
        "Content-Type": "application/json",
      },
      responseType: "stream",
      timeout: 90000,
    }
  );

  let buffer = "";
  let output = "";
  let usage = {};

  for await (const chunk of response.data) {
    buffer += chunk.toString("utf8").replace(/\r\n/g, "\n");
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";
    for (const block of blocks) {
      const event = parseSseBlock(block);
      if (!event) continue;
      if (event.type === "response.output_text.delta" && event.delta) {
        output += event.delta;
        onDelta?.(event.delta);
      }
      if (event.type === "response.completed") {
        usage = event.response?.usage || {};
      }
      if (event.type === "error" || event.type === "response.failed") {
        throw new Error(event.error?.message || event.response?.error?.message || "OpenAI streaming failed.");
      }
    }
  }

  if (!output.trim()) throw new Error("OpenAI returned an empty response.");
  return {
    text: output.trim(),
    __usage: {
      inputTokens: Number(usage.input_tokens || 0),
      outputTokens: Number(usage.output_tokens || 0),
    },
  };
}

async function transcribeAudio({ base64, mimeType = "audio/webm" }) {
  const bytes = Buffer.from(base64, "base64");
  if (!bytes.length) throw new Error("The audio recording is empty.");
  const normalizedMimeType = String(mimeType).split(";")[0].toLowerCase();
  const extensions = {
    "audio/webm": "webm",
    "audio/wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/ogg": "ogg",
  };
  const form = new FormData();
  form.append(
    "file",
    new Blob([bytes], { type: normalizedMimeType }),
    `webilo-recording.${extensions[normalizedMimeType] || "webm"}`
  );
  form.append("model", "whisper-1");
  form.append("response_format", "json");

  const response = await axios.post(
    "https://api.openai.com/v1/audio/transcriptions",
    form,
    {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY.value()}` },
      timeout: 90000,
    }
  );
  const text = response.data?.text?.trim();
  if (!text) throw new Error("Whisper returned an empty transcription.");
  return text;
}

module.exports = { generateJson, parseSseBlock, streamText, transcribeAudio };
