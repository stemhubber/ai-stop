// controllers/MockSender.js
export const MockSender = {
  send({ to, message }) {
    console.log("📨 MOCK SEND");
    console.log("To:", to);
    console.log("Message:", message);

    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ success: true });
      }, 1000);
    });
  },
};
