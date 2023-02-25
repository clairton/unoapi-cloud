import app from "./app";

const PORT: Number = parseInt(process.env.PORT || "9876");

app.server.listen(PORT, async () => {
  console.info(`Baileys Cloud API listening on *:${PORT}`)
  console.info(`Successful started app!`)
});

export default app;