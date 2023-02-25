import { App } from "./app";

const app = new App();

const port = process.env.PORT || 9876

app.server.listen(port);