// Contrôleur pour la gestion des zones maraîchères
const prisma = require('../utils/prisma');

// Statuts considérés comme "actifs" pour une plantation
const STATUTS_ACTIFS = [
  'PLANIFIE',
  'SEME',
  'EN_PEPINIERE',
  'TRANSPLANTE',
  'EN_CROISSANCE',
  'EN_RECOLTE',
];

// GET / — Liste toutes les zones avec le nombre de planches et de plantations actives
const list = async (req, res, next) => {
  try {
    const zones = await prisma.zone.findMany({
      include: {
        _count: {
          select: {
            beds: true,
          },
        },
        beds: {
          select: {
            id: true,
            _count: {
              select: {
                plantings: {
                  where: {
                    status: { in: STATUTS_ACTIFS },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculer le total de plantations actives pour chaque zone
    const zonesAvecStats = zones.map((zone) => {
      const activePlantingsCount = zone.beds.reduce(
        (total, bed) => total + bed._count.plantings,
        0
      );

      return {
        id: zone.id,
        name: zone.name,
        description: zone.description,
        createdAt: zone.createdAt,
        updatedAt: zone.updatedAt,
        _count: {
          beds: zone._count.beds,
          activePlantings: activePlantingsCount,
        },
      };
    });

    res.json(zonesAvecStats);
  } catch (err) {
    next(err);
  }
};

// GET /:id — Détail d'une zone avec toutes ses planches et la plantation active courante
const detail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const zone = await prisma.zone.findUnique({
      where: { id },
      include: {
        beds: {
          include: {
            plantings: {
              where: {
                status: { in: STATUTS_ACTIFS },
              },
              include: {
                cultivar: {
                  include: { species: true },
                },
                season: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!zone) {
      return res.status(404).json({ message: 'Zone introuvable.' });
    }

    // Formater pour inclure la plantation active courante de chaque planche
    const zoneFormatee = {
      ...zone,
      beds: zone.beds.map((bed) => ({
        ...bed,
        currentPlanting: bed.plantings[0] || null,
        plantings: undefined, // Retirer le tableau brut
      })),
    };

    res.json(zoneFormatee);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, detail };
