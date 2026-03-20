// Contrôleur pour la gestion des modèles de tâches
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');

// POST / — Crée un nouveau modèle de tâche
const create = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ erreurs: errors.array() });
    }

    const {
      cultureSheetId,
      name,
      templateName,
      description,
      direction,
      daysOffset,
      minutesPerM2,
      positionOrder,
    } = req.body;

    const template = await prisma.taskTemplate.create({
      data: {
        cultureSheetId,
        name,
        templateName: templateName || null,
        description,
        direction: direction || 'APRES',
        daysOffset: parseInt(daysOffset) || 0,
        minutesPerM2: minutesPerM2 ? parseFloat(minutesPerM2) : null,
        positionOrder: positionOrder ? parseInt(positionOrder) : 0,
      },
      include: {
        cultureSheet: { include: { species: true } },
      },
    });

    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
};

// PUT /:id — Met à jour un modèle de tâche
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      templateName,
      description,
      direction,
      daysOffset,
      minutesPerM2,
      positionOrder,
    } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (templateName !== undefined) data.templateName = templateName;
    if (description !== undefined) data.description = description;
    if (direction !== undefined) data.direction = direction;
    if (daysOffset !== undefined) data.daysOffset = parseInt(daysOffset);
    if (minutesPerM2 !== undefined) data.minutesPerM2 = parseFloat(minutesPerM2);
    if (positionOrder !== undefined) data.positionOrder = parseInt(positionOrder);

    const template = await prisma.taskTemplate.update({
      where: { id },
      data,
      include: { cultureSheet: { include: { species: true } } },
    });

    res.json(template);
  } catch (err) {
    next(err);
  }
};

// DELETE /:id — Supprime un modèle de tâche
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.taskTemplate.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { create, update, remove };
