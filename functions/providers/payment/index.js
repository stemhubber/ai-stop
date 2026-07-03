const paystack = require("../../paystack");

const providers = { paystack };

function getPaymentProvider(name = process.env.PAYMENT_PROVIDER || "paystack") {
  const provider = providers[name];
  if (!provider) throw new Error(`Unsupported payment provider: ${name}`);
  return provider;
}

module.exports = { getPaymentProvider };
