// Auth désactivée — utilisateur système fixe
const SYSTEM_USER = {
  id: 'system-user-00000000-0000-0000-0000-000000000000',
  email: 'system@local',
  name: 'Exploitation',
  role: 'MARAICHER',
};

const authenticateToken = (req, res, next) => {
  req.user = SYSTEM_USER;
  next();
};

const authenticate = authenticateToken;
const requireRole = () => (req, res, next) => next();

module.exports = { authenticateToken, authenticate, requireRole };
