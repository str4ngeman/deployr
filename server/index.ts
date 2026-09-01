import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import filesRouter from "./routes/files.js";
import dockerRouter from "./routes/docker.js";
import settingsRouter from "./routes/settings.js";
import authRouter from "./routes/auth.js";
import composeRouter from "./routes/compose.js";
import monitorRouter from "./routes/monitor.js";
import backupsRouter from "./routes/backups.js";
import schedulerRouter from "./routes/scheduler.js";
import activityRouter from "./routes/activity.js";
import envRouter from "./routes/env.js";
import { authMiddleware } from "./middleware/auth.js";
import { initDatabase } from "./lib/db.js";
import { getFileRoot } from "./lib/paths.js";
import { isDockerEnabled, checkDockerConnection } from "./lib/docker.js";
import { startBackgroundServices } from "./services/background.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "4199", 10);
const isDev = process.env.NODE_ENV !== "production";

initDatabase();
startBackgroundServices();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
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

app.use("/api/auth", authRouter);
app.use(authMiddleware);

app.use("/api/files", filesRouter);
app.use("/api/docker", dockerRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/compose", composeRouter);
app.use("/api/monitor", monitorRouter);
app.use("/api/backups", backupsRouter);
app.use("/api/scheduler", schedulerRouter);
app.use("/api/activity", activityRouter);
app.use("/api/env", envRouter);

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
