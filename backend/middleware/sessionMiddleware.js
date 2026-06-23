const crypto = require('crypto');

const sessionScope = (req, res, next) => {
  const id = String(req.get('X-Session-ID') || '').trim();
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(id)) {
    return res.status(400).json({ message: 'A valid anonymous session identifier is required.' });
  }
  req.ownerKey = crypto.createHash('sha256').update(id).digest('hex');
  next();
};

module.exports = { sessionScope };
