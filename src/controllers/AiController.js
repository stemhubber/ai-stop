import axios from "axios";

export async function generateSite({ promptText, siteType, themeColor }) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4.1", // Higher quality model recommended
        messages: [
          {
            role: "system",
            content: `
You are an elite website designer + front-end engineer.
You ONLY output valid JSON and NEVER output HTML outside JSON.

The JSON structure MUST be:

{
  "title": "string",
  "palette": {
    "primary": "string",
    "background": "string",
    "text": "string"
  },
  "html": "string"
}

Rules:
- HTML must be embedded INSIDE the JSON only.
- Do NOT escape HTML unnecessarily—return clean strings.
- Create PREMIUM QUALITY, elegant, modern, responsive HTML.
- Hero section must be provided
- Includes images
- Use large spacing, typography scale, gradients, nice paddings.
- Use only inline styles or minimal classes.
- Never wrap the final output in backticks or code blocks.
`
          },

          {
            role: "user",
            content: `
Generate a premium-quality website.

User Description:
${promptText}

Site Type: ${siteType}
Theme Color: ${themeColor || "auto"}

Sections Required:
- Hero
- About
- Services
- Contact

Return ONLY valid JSON following the schema EXACTLY.
`
          }
        ]
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        }
      }
    );

    const aiText = response.data.choices[0].message.content.trim();

    try {
      return JSON.parse(aiText);
    } catch (err) {
      console.error("❌ Failed to parse JSON from AI. Raw output:\n", aiText);
      return null;
    }

  } catch (error) {
    console.error("❌ Error calling OpenAI API:", error.response?.data || error);
    return null;
  }
}
