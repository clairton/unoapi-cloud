"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const PORT = parseInt(process.env.PORT || "9876");
app_1.default.server.listen(PORT, async () => {
    console.info(`Baileys Cloud API listening on *:${PORT}`);
    console.info(`Successful started app!`);
});
exports.default = app_1.default;
