function getHealth(req, res) {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'backend',
      timestamp: new Date().toISOString()
    }
  });
}

module.exports = {
  getHealth
};
