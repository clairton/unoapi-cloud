"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const transport_model_1 = require("./services/transport.model");
const baileys_1 = __importStar(require("baileys"));
const pino_1 = __importDefault(require("pino"));
async function connectToWhatsApp() {
    const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)("voice_call_baileys");
    const sock = (0, baileys_1.default)({
        printQRInTerminal: true,
        auth: state,
        browser: baileys_1.Browsers.macOS('Desktop'),
        logger: (0, pino_1.default)({ level: "error" }),
        syncFullHistory: false,
        markOnlineOnConnect: false
    });
    (0, transport_model_1.useVoiceCallsBaileys)("your token", sock, "close", true);
    sock.ev.on("creds.update", saveCreds);
    sock.ev.on('connection.update', (update) => {
        var _a, _b;
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log('opened connection');
        }
        if (connection === "close") {
            if ([baileys_1.DisconnectReason.loggedOut, baileys_1.DisconnectReason.forbidden].includes((_b = (_a = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode)) {
                console.log("Connection close");
            }
            else {
                connectToWhatsApp();
            }
        }
    });
}
connectToWhatsApp();
