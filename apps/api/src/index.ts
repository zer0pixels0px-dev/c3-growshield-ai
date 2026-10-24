import { createApp, API_VERSION } from "./app";

const app = createApp();
const port = Number(process.env.API_PORT ?? 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API GrowShield v${API_VERSION} sur :${port} (DATABASE_URL ${process.env.DATABASE_URL ? "configurée" : "absente : les routes base répondent 503"})`);
});
