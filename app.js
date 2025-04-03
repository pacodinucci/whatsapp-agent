const {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  EVENTS,
} = require("@bot-whatsapp/bot");
const BaileysProvider = require("@bot-whatsapp/provider/baileys");
const MockAdapter = require("@bot-whatsapp/database/mock");
const axios = require("axios");

const flowChatGPT = addKeyword(EVENTS.WELCOME).addAction(
  async (ctx, { flowDynamic }) => {
    try {
      console.log(`🔹 Mensaje recibido de ${ctx.from}: ${ctx.body}`);

      // 🔹 Enviar el mensaje del usuario a la API de OpenAI
      const response = await axios.post("http://localhost:3002/chat", {
        number: ctx.from,
        messages: [{ role: "user", content: ctx.body }],
      });

      // 🔹 Obtener la respuesta de la API
      const reply = response.data.response || "Lo siento, no pude responder.";

      console.log(`🔹 Respuesta generada: ${reply}`);

      // 🔹 Enviar la respuesta al usuario en WhatsApp
      await flowDynamic(reply);
    } catch (error) {
      console.error("❌ Error al procesar el mensaje:", error);
      await flowDynamic(
        "Hubo un error al generar la respuesta. Intenta de nuevo."
      );
    }
  }
);

const main = async () => {
  const adapterDB = new MockAdapter();
  const adapterProvider = createProvider(BaileysProvider);
  const adapterFlow = createFlow([flowChatGPT]);

  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });
};

main();
