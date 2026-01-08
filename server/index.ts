import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { handleSignRequest } from "./poly-server";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.post("/sign", async (c) => {
	try {
		const result = await handleSignRequest(c.req.raw);
		return c.json(result);
	} catch (error) {
		console.error("Error handling sign request:", error);
		return c.json({ error: "Failed to process sign request" }, 500);
	}
});

app.get("/health", (c) => {
	return c.json({ status: "ok" });
});

const port = Number(process.env.PORT) || 3001;

console.log(`🚀 Server running on http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});
