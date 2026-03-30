const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pemb-estimator-secret-change-in-production';
const TOKEN_EXPIRY = '7d';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, displayName: user.display_name },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/** Express middleware: verifies JWT and attaches user to req */
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { generateToken, authMiddleware, JWT_SECRET };
