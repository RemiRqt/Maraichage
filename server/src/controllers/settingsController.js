// Contrôleur pour les paramètres de l'application et le profil utilisateur
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

// Nombre de tours de hachage pour bcrypt
const BCRYPT_ROUNDS = 12;

// GET / — Retourne tous les paramètres de l'application sous forme { clé: valeur }
const list = async (req, res, next) => {
  try {
    const settings = await prisma.appSetting.findMany({
      orderBy: { key: 'asc' },
    });

    // Transformer le tableau en objet clé-valeur
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json(settingsMap);
  } catch (err) {
    next(err);
  }
};

// PUT / — Met à jour plusieurs paramètres en une seule requête (upsert)
const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ message: 'Le champ "settings" est requis et doit être un objet.' });
    }

    // Upsert chaque paramètre dans une transaction
    const mises_a_jour = await prisma.$transaction(
      Object.entries(settings).map(([key, value]) =>
        prisma.appSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    // Retourner le résultat sous forme clé-valeur
    const settingsMap = mises_a_jour.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    res.json(settingsMap);
  } catch (err) {
    next(err);
  }
};

// GET /profile — Retourne le profil de l'utilisateur connecté
const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
};

// PUT /profile — Met à jour le profil de l'utilisateur (nom, email, mot de passe)
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { name, email, password } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;

    // Hacher le nouveau mot de passe si fourni
    if (password) {
      data.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    res.json(user);
  } catch (err) {
    // Gérer les conflits d'email unique
    if (err.code === 'P2002') {
      return res.status(409).json({
        message: 'Cette adresse email est déjà utilisée par un autre compte.',
      });
    }
    next(err);
  }
};

module.exports = { list, update, getProfile, updateProfile };
