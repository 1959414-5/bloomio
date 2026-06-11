import "dotenv/config";
import express from "express";
import cors from "cors";

import { stripeWebhook } from "./routes/stripe.js";
import stripeRoutes from "./routes/stripe.js";
import mpRoutes, { mpWebhook } from "./routes/mercadopago.js";
import nfseRoutes from "./routes/nfse.js";
import whatsappRoutes from "./routes/whatsapp.js";
import aiRoutes from "./routes/ai.js";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL?.split(",") || "*" }));

// Webhooks precisam do corpo CRU (raw) para validar assinatura — antes do express.json()
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhook);
app.post("/webhooks/mercadopago", express.json(), mpWebhook);

app.use(express.json({ limit: "5mb" }));

app.get("/", (_req, res) => res.json({ ok: true, service: "bloomio-api" }));

app.use("/stripe", stripeRoutes);
app.use("/mp", mpRoutes);
app.use("/nfse", nfseRoutes);
app.use("/whatsapp", whatsappRoutes);
app.use("/ai", aiRoutes);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Bloomio API on :${port}`));
