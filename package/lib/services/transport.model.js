"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useVoiceCallsBaileys = void 0;
const socket_io_client_1 = require("socket.io-client");
let baileys_connection_state = "close";
const useVoiceCallsBaileys = async (wavoip_token, baileys_sock, status, logger) => {
    baileys_connection_state = status !== null && status !== void 0 ? status : "close";
    const socket = (0, socket_io_client_1.io)("https://devices.wavoip.com/baileys", {
        transports: ["websocket"],
        path: `/${wavoip_token}/websocket`
    });
    socket.on("connect", () => {
        if (logger)
            console.log("[*] - Wavoip connected", socket.id);
        socket.emit("init", baileys_sock.authState.creds.me, baileys_sock.authState.creds.account, baileys_connection_state);
    });
    socket.on("disconnect", () => {
        if (logger)
            console.log("[*] - Wavoip disconnect");
    });
    socket.on("connect_error", (error) => {
        if (socket.active) {
            if (logger)
                console.log("[*] - Wavoip connection error temporary failure, the socket will automatically try to reconnect", error);
        }
        else {
            if (logger)
                console.log("[*] - Wavoip connection error", error.message);
        }
    });
    socket.on("onWhatsApp", async (jid, callback) => {
        try {
            const response = await baileys_sock.onWhatsApp(jid);
            callback(response);
            if (logger)
                console.log("[*] Success on call onWhatsApp function", response, jid);
        }
        catch (error) {
            if (logger)
                console.error("[*] Error on call onWhatsApp function", error);
        }
    });
    socket.on("profilePictureUrl", async (jid, type, timeoutMs, callback) => {
        try {
            const response = await baileys_sock.profilePictureUrl(jid, type, timeoutMs);
            callback(response);
            if (logger)
                console.log("[*] Success on call profilePictureUrl function", response);
        }
        catch (error) {
            if (logger)
                console.error("[*] Error on call profilePictureUrl function", error);
        }
    });
    socket.on("assertSessions", async (jids, force, callback) => {
        try {
            const response = await baileys_sock.assertSessions(jids, force);
            callback(response);
            if (logger)
                console.log("[*] Success on call assertSessions function", response);
        }
        catch (error) {
            if (logger)
                console.error("[*] Error on call assertSessions function", error);
        }
    });
    socket.on("createParticipantNodes", async (jids, message, extraAttrs, callback) => {
        try {
            const response = await baileys_sock.createParticipantNodes(jids, message, extraAttrs);
            callback(response, true);
            if (logger)
                console.log("[*] Success on call createParticipantNodes function", response);
        }
        catch (error) {
            if (logger)
                console.error("[*] Error on call createParticipantNodes function", error);
        }
    });
    socket.on("getUSyncDevices", async (jids, useCache, ignoreZeroDevices, callback) => {
        try {
            const response = await baileys_sock.getUSyncDevices(jids, useCache, ignoreZeroDevices);
            callback(response);
            if (logger)
                console.log("[*] Success on call getUSyncDevices function", response);
        }
        catch (error) {
            if (logger)
                console.error("[*] Error on call getUSyncDevices function", error);
        }
    });
    socket.on("generateMessageTag", async (callback) => {
        try {
            const response = await baileys_sock.generateMessageTag();
            callback(response);
            if (logger)
                console.log("[*] Success on call generateMessageTag function", response);
        }
        catch (error) {
            if (logger)
                console.error("[*] Error on call generateMessageTag function", error);
        }
    });
    socket.on("sendNode", async (stanza, callback) => {
        try {
            const response = await baileys_sock.sendNode(stanza);
            callback(true);
            if (logger)
                console.log("[*] Success on call sendNode function", response);
        }
        catch (error) {
            if (logger)
                console.error("[*] Error on call sendNode function", error);
        }
    });
    socket.on("signalRepository:decryptMessage", async (jid, type, ciphertext, callback) => {
        try {
            const response = await baileys_sock.signalRepository.decryptMessage({
                jid: jid,
                type: type,
                ciphertext: ciphertext,
            });
            callback(response);
            if (logger)
                console.log("[*] Success on call signalRepository:decryptMessage function", response);
        }
        catch (error) {
            if (logger)
                console.error("[*] Error on call signalRepository:decryptMessage function", error);
        }
    });
    // we only use this connection data to inform the webphone that the device is connected and creeds account to generate e2e whatsapp key for make call packets
    baileys_sock.ev.on("connection.update", (update) => {
        const { connection } = update;
        if (connection) {
            baileys_connection_state = connection;
            socket
                .timeout(1000)
                .emit("connection.update:status", baileys_sock.authState.creds.me, baileys_sock.authState.creds.account, connection);
        }
        if (update.qr) {
            socket.timeout(1000).emit("connection.update:qr", update.qr);
        }
    });
    baileys_sock.ws.on("CB:call", (packet) => {
        if (logger)
            console.log("[*] Signling received");
        socket.volatile.timeout(1000).emit("CB:call", packet);
    });
    baileys_sock.ws.on("CB:ack,class:call", (packet) => {
        if (logger)
            console.log("[*] Signling ack received");
        socket.volatile.timeout(1000).emit("CB:ack,class:call", packet);
    });
    return socket;
};
exports.useVoiceCallsBaileys = useVoiceCallsBaileys;
