import { useVoiceCallsBaileys } from "./services/transport.model";

import makeWASocket, { Browsers, DisconnectReason, useMultiFileAuthState } from "baileys";
import P from "pino";
import { Boom } from '@hapi/boom';

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("voice_call_baileys");
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
    browser: Browsers.macOS('Desktop'),
    logger: P({ level: "error" }),
    syncFullHistory: false,
    markOnlineOnConnect: false
  })

  useVoiceCallsBaileys("your token", sock, "close", true)

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'open') {
      console.log('opened connection');
    }

    if (connection === "close") {
      if ([DisconnectReason.loggedOut, DisconnectReason.forbidden].includes((lastDisconnect?.error as Boom)?.output?.statusCode) ) {
        console.log("Connection close")
      }
      else {
        connectToWhatsApp()
      }
    }
  });
}

connectToWhatsApp()