"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = require("express");
const index_controller_1 = require("./controllers/index_controller");
const router = (0, express_1.Router)();
exports.router = router;
//Routes
router.get("/ping", index_controller_1.indexController.ping);
