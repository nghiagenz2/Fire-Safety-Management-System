const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const session = await authService.login(req.body);
    res.status(200).json({ success: true, data: session });
  } catch (error) {
    if (error.statusCode) {
      res.status(error.statusCode);
    }
    next(error);
  }
}

module.exports = {
  login
};
