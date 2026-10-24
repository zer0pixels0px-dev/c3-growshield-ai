// API v1 — squelette d'implémentation, contrat réel dans api/openapi.yaml.
// Lot 2 : brancher chaque route sur PostgreSQL (pool pg, DATABASE_URL),
// appliquer la pagination, la validation et les rôles décrits dans l'OpenAPI.
// Aucune route ne doit inventer de breeder, THC ou rendement : NULL = non documenté.
import express from "express";
const app = express();
app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok", version: "0.1.0" }));
app.get("/cultivars", (_req, res) => res.json({ data: [], note: "Lot 2 : requête sur v_cultivar_scores." }));
const port = Number(process.env.API_PORT ?? 3001);
app.listen(port, () => console.log(`API GrowShield sur :${port}`));
