const express = require('express');
const env = require('./config/env');
const routes = require('./routes');
const { testConnection } = require('./config/db');
const notFound = require('./middlewares/notFound.middleware');
const errorHandler = require('./middlewares/errorHandler.middleware');

const app = express();

app.use(express.json());

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, async () => {
  console.log(
    `Backend running at http://localhost:${env.PORT} (${env.NODE_ENV})`,
  );

  try {
    const db = await testConnection();
    console.log(`Database connected: ${env.DB_NAME} (PostGIS ${db.postgis_version})`);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
});
