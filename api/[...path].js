const app = require('../server');

module.exports = async function handler(req, res) {
  try {
    await app.connectToDatabase();
    return app(req, res);
  } catch (error) {
    console.error('Unable to connect to MongoDB:', error.message);
    return res.status(503).json({ error: 'Database is unavailable. Check the server configuration.' });
  }
};
