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
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const bind_1 = require("./jobs/bind");
const session_store_redis_1 = require("./services/session_store_redis");
const auto_connect_1 = require("./services/auto_connect");
const defaults_1 = require("./defaults");
const amqp_1 = require("./amqp");
const redis_1 = require("./services/redis");
const incoming_amqp_1 = require("./services/incoming_amqp");
const config_redis_1 = require("./services/config_redis");
const client_baileys_1 = require("./services/client_baileys");
const on_new_login_1 = require("./services/on_new_login");
const logger_1 = __importDefault(require("./services/logger"));
const reload_1 = require("./jobs/reload");
const disconnect_1 = require("./jobs/disconnect");
const listener_amqp_1 = require("./services/listener_amqp");
const outgoing_amqp_1 = require("./services/outgoing_amqp");
const outgoingAmqp = new outgoing_amqp_1.OutgoingAmqp(config_redis_1.getConfigRedis);
const incomingAmqp = new incoming_amqp_1.IncomingAmqp();
const listenerAmqp = new listener_amqp_1.ListenerAmqp();
const getConfig = config_redis_1.getConfigRedis;
const onNewLogin = new on_new_login_1.OnNewLogin(outgoingAmqp);
const bindJob = new bind_1.BindJob();
const reloadJob = new reload_1.ReloadJob(client_baileys_1.getClientBaileys, getConfig, listenerAmqp, incomingAmqp, onNewLogin.run.bind(onNewLogin));
const disconnectJob = new disconnect_1.DisconnectJob(client_baileys_1.getClientBaileys, getConfig, listenerAmqp, incomingAmqp, onNewLogin.run.bind(onNewLogin));
const startWorker = async () => {
    await (0, redis_1.startRedis)();
    logger_1.default.debug('Starting Worker');
    const sessionStore = new session_store_redis_1.SessionStoreRedis();
    logger_1.default.debug('Starting bind consumer');
    await (0, amqp_1.amqpConsume)(defaults_1.UNOAPI_JOB_BIND, '', bindJob.consume.bind(bindJob));
    logger_1.default.debug('Starting reload consumer');
    await (0, amqp_1.amqpConsume)(defaults_1.UNOAPI_JOB_RELOAD, '', reloadJob.consume.bind(reloadJob));
    logger_1.default.debug('Starting disconnect consumer');
    await (0, amqp_1.amqpConsume)(defaults_1.UNOAPI_JOB_DISCONNECT, '', disconnectJob.consume.bind(disconnectJob));
    logger_1.default.debug('Started worker');
    await (0, auto_connect_1.autoConnect)(sessionStore, incomingAmqp, listenerAmqp, config_redis_1.getConfigRedis, client_baileys_1.getClientBaileys, onNewLogin.run.bind(onNewLogin));
};
startWorker();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
process.on('unhandledRejection', (reason, promise) => {
    logger_1.default.error('unhandledRejection: %s %s %s', reason, reason.stack, promise);
    throw reason;
});