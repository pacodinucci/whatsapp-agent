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

const messageBuffer = {};

const flowChatGPT = addKeyword(EVENTS.WELCOME).addAction(
  async (ctx, { flowDynamic }) => {
    const user = ctx.from;
    if (!messageBuffer[user]) {
      messageBuffer[user] = {
        messages: [],
        timeout: null,
      };
    }

    // Guardar mensaje
    messageBuffer[user].messages.push(ctx.body);

    // Reiniciar el temporizador
    clearTimeout(messageBuffer[user].timeout);
    messageBuffer[user].timeout = setTimeout(async () => {
      const fullMessage = messageBuffer[user].messages.join(" ");
      delete messageBuffer[user]; // Limpiar buffer

      try {
        const response = await axios.post("http://localhost:3001/chat", {
          number: user,
          messages: [{ role: "user", content: fullMessage }],
        });

        const { message: rawMessage } = response.data;
        let parsed = { message: rawMessage, media: undefined };

        try {
          parsed = JSON.parse(rawMessage);
        } catch (e) {
          console.warn("No se pudo parsear el mensaje como JSON.");
        }

        const { message, media } = parsed;
        if (media) {
          await flowDynamic([
            { body: message || "Mensaje sin contenido.", media },
          ]);
        } else {
          await flowDynamic(message || "Lo siento, no pude responder.");
        }
      } catch (err) {
        console.error("❌ Error:", err);
        await flowDynamic("Hubo un error al generar la respuesta.");
      }
    }, 10000); // Esperar 5 segundos antes de procesar
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
