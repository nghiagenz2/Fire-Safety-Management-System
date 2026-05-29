const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const routes = require("./routes");
const { testConnection } = require("./config/db");
const notFound = require("./middlewares/notFound.middleware");
const errorHandler = require("./middlewares/errorHandler.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", routes);

const dashboardRoute = require("./routes/dashboard.route");
app.use("/api/manager/dashboard", dashboardRoute);

const incidentsRoute = require("./routes/incidents.route");
app.use("/api/manager/incidents", incidentsRoute);

const floorsRoute = require("./routes/floors.route");
app.use("/api/manager/floors", floorsRoute);

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, async () => {
  console.log(
    `Backend running at http://localhost:${env.PORT} (${env.NODE_ENV})`,
  );

  try {
    const db = await testConnection();
    console.log(
      `Database connected: ${env.DB_NAME} (PostGIS ${db.postgis_version})`,
    );
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
});
