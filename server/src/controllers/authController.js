// ============================================================
// Contrôleur Authentification
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

/**
 * Génère un access token JWT (courte durée)
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
};

/**
 * Génère un refresh token JWT (longue durée)
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

/**
 * POST /auth/login
 * Connexion avec email + mot de passe
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Rechercher l'utilisateur
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Générer les tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Stocker le refresh token en base
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 jours
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    logger.info({ userId: user.id, email: user.email }, 'Connexion réussie');

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/register
 * Création d'un nouveau compte utilisateur
 */
const register = async (req, res, next) => {
  try {
    const { email, password, name, role } = req.body;

    // Vérifier que l'email n'est pas déjà utilisé
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'MARAICHER',
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    logger.info({ userId: user.id, email }, 'Nouvel utilisateur créé');

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/refresh
 * Rafraîchir l'access token avec le refresh token
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token manquant' });
    }

    // Vérifier le token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(403).json({ error: 'Refresh token invalide ou expiré' });
    }

    // Vérifier que le token existe en base et n'est pas expiré
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(403).json({ error: 'Refresh token révoqué ou expiré' });
    }

    // Générer un nouvel access token
    const accessToken = generateAccessToken(decoded.userId);

    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/logout
 * Révoque le refresh token
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }

    res.json({ message: 'Déconnexion réussie' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, refresh, logout };
