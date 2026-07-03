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
  return JSON.parse(output);
}

async function transcribeAudio({ base64, mimeType = "audio/webm" }) {
  const bytes = Buffer.from(base64, "base64");
  const form = new FormData();
  form.append(
    "file",
    new Blob([bytes], { type: mimeType }),
    mimeType.includes("wav") ? "recording.wav" : "recording.webm"
  );
  form.append("model", "gpt-4o-mini-transcribe");

  const response = await axios.post(
    "https://api.openai.com/v1/audio/transcriptions",
    form,
    {
      headers: { Authorization: `Bearer ${OPENAI_API_KEY.value()}` },
      timeout: 90000,
    }
  );
  return response.data?.text || "";
}

module.exports = { generateJson, transcribeAudio };
