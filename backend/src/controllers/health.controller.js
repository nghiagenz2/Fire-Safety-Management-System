const { testConnection } = require('../config/db');

async function getHealth(req, res, next) {
  try {
    const db = await testConnection();

    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        service: 'backend',
        database: {
          status: 'connected',
          time: db.now,
          postgisVersion: db.postgis_version
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHealth
};
