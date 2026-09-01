import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import filesRouter from "./routes/files.js";
import dockerRouter from "./routes/docker.js";
import settingsRouter from "./routes/settings.js";
import { initDatabase } from "./lib/db.js";
import { getFileRoot } from "./lib/paths.js";
import { isDockerEnabled, checkDockerConnection } from "./lib/docker.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "4199", 10);
const isDev = process.env.NODE_ENV !== "production";

initDatabase();

const app = express();

app.use(cors());
app.use(express.json({ limit: "6mb" }));

app.get("/api/health", async (_req, res) => {
  res.json({
    status: "ok",
    fileRoot: getFileRoot(),
    port: PORT,
    docker: {
      enabled: isDockerEnabled(),
      connected: isDockerEnabled() ? await checkDockerConnection() : false,
    },
  });
});

app.use("/api/files", filesRouter);
app.use("/api/docker", dockerRouter);
app.use("/api/settings", settingsRouter);

if (!isDev) {
  const clientDir = path.join(__dirname, "../client");
  app.use(express.static(clientDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Deployr running on http://0.0.0.0:${PORT}`);
  console.log(`File root: ${getFileRoot()}`);
});
