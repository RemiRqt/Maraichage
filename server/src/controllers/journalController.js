// Contrôleur pour le journal de bord maraîcher
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

// GET / — Liste les entrées du journal avec filtres
const list = async (req, res, next) => {
  try {
    const { date_from, date_to, tag, bed_id, planting_id, search } = req.query;

    const where = {};

    if (bed_id) where.bedId = bed_id;
    if (planting_id) where.plantingId = planting_id;
    if (search) where.content = { contains: search };

    if (date_from || date_to) {
      where.date = {};
      if (date_from) where.date.gte = new Date(date_from);
      if (date_to) where.date.lte = new Date(date_to);
    }

    // Filtre par tag dans le tableau JSON
    if (tag) {
      where.tags = {
        array_contains: tag,
      };
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        bed: { include: { zone: true } },
        planting: {
          include: {
            cultivar: { include: { species: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json(entries);
  } catch (err) {
    next(err);
  }
};

// GET /:id — Détail d'une entrée du journal avec toutes les relations
const detail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        bed: { include: { zone: true } },
        planting: {
          include: {
            cultivar: { include: { species: true } },
            season: true,
          },
        },
      },
    });

    if (!entry) {
      return res.status(404).json({ message: 'Entrée de journal introuvable.' });
    }

    res.json(entry);
  } catch (err) {
    next(err);
  }
};

// POST / — Crée une nouvelle entrée de journal
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const {
      content,
      date,
      tags,
      bedId,
      plantingId,
    } = req.body;

    const entry = await prisma.journalEntry.create({
      data: {
        userId: req.user.id,
        content,
        date: date ? new Date(date) : new Date(),
        tags: tags || [],
        bedId: bedId || null,
        plantingId: plantingId || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
};

// PUT /:id — Met à jour une entrée (propriétaire uniquement)
const update = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const { id } = req.params;

    // Vérifier que l'utilisateur est bien le propriétaire
    const entry = await prisma.journalEntry.findUnique({ where: { id } });
    if (!entry) {
      return res.status(404).json({ message: 'Entrée de journal introuvable.' });
    }

    if (entry.userId !== req.user.id) {
      return res.status(403).json({
        message: 'Vous n\'êtes pas autorisé à modifier cette entrée.',
      });
    }

    const { content, date, tags } = req.body;

    const data = {};
    if (content !== undefined) data.content = content;
    if (date !== undefined) data.date = new Date(date);
    if (tags !== undefined) data.tags = tags;

    const updated = await prisma.journalEntry.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /:id — Supprime une entrée (propriétaire uniquement)
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Vérifier que l'utilisateur est bien le propriétaire
    const entry = await prisma.journalEntry.findUnique({ where: { id } });
    if (!entry) {
      return res.status(404).json({ message: 'Entrée de journal introuvable.' });
    }

    if (entry.userId !== req.user.id) {
      return res.status(403).json({
        message: 'Vous n\'êtes pas autorisé à supprimer cette entrée.',
      });
    }

    await prisma.journalEntry.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { list, detail, create, update, remove };
