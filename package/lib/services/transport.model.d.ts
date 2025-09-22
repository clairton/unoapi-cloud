import { Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "./transport.type";
import { WAConnectionState, WASocket } from "baileys";
export declare const useVoiceCallsBaileys: (wavoip_token: string, baileys_sock: WASocket, status?: WAConnectionState, logger?: boolean) => Promise<Socket<ServerToClientEvents, ClientToServerEvents>>;
