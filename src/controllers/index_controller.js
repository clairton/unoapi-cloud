"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexController = void 0;
class IndexController {
    ping(_req, res) {
        res.set("Content-Type", "text/plain");
        return res.status(200).send("pong!");
    }
}
exports.indexController = new IndexController();
