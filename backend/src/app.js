const express = require("express");
const env = require("./config/env");
const routes = require("./routes");
const { testConnection } = require("./config/db");
const { ensureManagerTables } = require("./config/schema");
const notFound = require("./middlewares/notFound.middleware");
const errorHandler = require("./middlewares/errorHandler.middleware");

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

app.use(express.json());

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, async () => {
  console.log(
    `Backend running at http://localhost:${env.PORT} (${env.NODE_ENV})`,
  );

  try {
    const db = await testConnection();
    await ensureManagerTables();
    console.log(`Database connected: ${env.DB_NAME} (${db.now.toISOString()})`);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
});
