const openai = require("./openai");

const providers = { openai };

function getAIProvider(name = process.env.AI_PROVIDER || "openai") {
  const provider = providers[name];
  if (!provider) throw new Error(`Unsupported AI provider: ${name}`);
  return provider;
}

module.exports = { getAIProvider };
