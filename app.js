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

        let rawMessage = response.data.message;

        console.log("RAW MESSAGE --> ", response.data);

        // 🧠 Si el modelo devuelve directamente un objeto, no lo parsees
        if (typeof rawMessage !== "string") {
          rawMessage = JSON.stringify(rawMessage);
        }

        let parsed;

        if (typeof response.data.message === "object") {
          // Ya vino parseado (desde el backend)
          parsed = response.data.message;
        } else {
          // Intentamos parsear por si vino como string plano
          try {
            parsed = JSON.parse(response.data.message);
          } catch (e) {
            parsed = { message: response.data.message, media: undefined };
          }
        }

        if (parsed.media) {
          await flowDynamic([
            {
              body: parsed.message || "Mensaje sin contenido.",
              media: parsed.media,
            },
          ]);
        } else {
          await flowDynamic(parsed.message || "Lo siento, no pude responder.");
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
