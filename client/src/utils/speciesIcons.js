// Mapping espèce → emoji pour l'affichage dans toute l'app
// Couvre les 203 espèces de la base

const SPECIES_ICONS = {
  // Légumes fruits
  'Aubergine': '🍆',
  'Tomate': '🍅', 'Tomates': '🍅', 'Tomates ancestrales': '🍅', 'Tomates cerises': '🍅',
  'Poivron': '🫑', 'Poivrons (serre)': '🫑', 'Poivrons (champs)': '🫑', 'Poivrons doux': '🫑',
  'Piments forts': '🌶️',
  'Concombre': '🥒', 'Concombre (serre)': '🥒', 'Concombres (champs)': '🥒', 'Concombre Cucamelon': '🥒',
  'Courgette': '🥒', 'Courgettes d\'été': '🥒',
  'Courges d\'hiver': '🎃', 'Citrouille': '🎃', 'Pâtisson': '🎃',
  'Melon': '🍈', 'Melon d\'eau': '🍉', 'Pastèque': '🍉',
  'Okra (gombo)': '🫛',
  'Kiwano': '🥝',
  'Pépino': '🍈',

  // Légumes feuilles
  'Laitue': '🥬', 'Laitue pommée': '🥬', 'Mélange de Laitue': '🥬',
  'Epinards': '🥬',
  'Mesclun (mix)': '🥗',
  'Bok choy': '🥬',
  'Mâche': '🥬',
  'Roquette': '🥬',
  'Bette à carde': '🥬',
  'Chou (été)': '🥦', 'Chou (automne)': '🥦', 'Chou (chinois)': '🥦', 'Chou (Milan)': '🥦',
  'Chou Cavalier': '🥦', 'Chou kale': '🥦', 'Chou kale (petit)': '🥦', 'Chou ornamental': '🥦',
  'Choux de Bruxelles': '🥦',
  'Brocoli': '🥦', 'Brocoli-rave': '🥦',
  'Chou-fleur (romanesco)': '🥦',
  'Chou-rave': '🥦', 'Chou-rave (conservation)': '🥦',
  'Chicorée frisée': '🥬', 'Chicorée Rouge': '🥬', 'Chicorée scarole': '🥬', 'Chicorée Pain de Sucre': '🥬',
  'Cresson': '🌱', 'Cresson de fontaine': '🌱',
  'Tatsoi': '🥬', 'Tatsoi (mini)': '🥬',
  'Arroche Rouge': '🥬',
  'Endive': '🥬',
  'Pissenlit': '🌿',

  // Légumes racines
  'Carotte': '🥕', 'Carottes (conservation)': '🥕', 'Carottes (primeur)': '🥕',
  'Betterave': '🟣',
  'Radis': '🔴', 'Radis d\'hiver': '🔴',
  'Navet': '🟡', 'Rabiole (hakurei)': '🟡',
  'Panais': '🥕',
  'Salsifis': '🥕',
  'Rutabaga': '🟡',
  'Céleri-rave': '🟢', 'Céleri-rave (mini)': '🟢',
  'Patate douce': '🍠',
  'Pommes de terre (conservation)': '🥔', 'Pommes de terre (nouvelles)': '🥔',
  'Topinambour': '🥔',
  'Gingembre (petit)': '🫚',
  'Curcuma': '🫚',

  // Légumes tiges / bulbes
  'Céleri': '🥬',
  'Fenouil': '🌿', 'Fenouil (mini)': '🌿',
  'Artichaut': '🌿',
  'Cardon': '🌿',
  'Rhubarbe': '🌿',
  'Asperge': '🌿',
  'Poireaux (été)': '🧅', 'Poireaux (conservation)': '🧅',
  'Oignon (frais)': '🧅', 'Oignon vert': '🧅', 'Oignons (conservation)': '🧅',
  'Échalote': '🧅',
  'Ail': '🧄',
  'Ciboulette': '🧅',
  'Citronnelle': '🌿',

  // Légumineuses
  'Haricots nains': '🫘', 'Haricots à rames': '🫘',
  'Petits pois': '🫛', 'Pois mange-tout': '🫛',
  'Fèves': '🫘', 'Féverolle': '🫘',
  'Edamame': '🫛',

  // Aromatiques
  'Basilic': '🌿',
  'Coriandre': '🌿',
  'Persil': '🌿',
  'Aneth': '🌿',
  'Menthe': '🌿',
  'Thym': '🌿',
  'Romarin': '🌿',
  'Sauge': '🌿',
  'Oseille': '🌿',
  'Perilla': '🌿', 'Shiso (Périlla pourpre)': '🌿',
  'Cerfeuil': '🌿',
  'Mélange de fines herbes': '🌿',

  // Fruits
  'Fraises': '🍓',
  'Framboises': '🫐',
  'Myrtilles': '🫐',
  'Mûres': '🫐',
  'Cassis': '🫐',
  'Cerise de terre': '🟡',

  // Céréales / engrais verts
  'Maïs': '🌽',
  'Avoine': '🌾', 'Blé': '🌾', 'Seigle': '🌾', 'Triticale': '🌾', 'Millet': '🌾', 'Sarrasin': '🌾',
  'Trèfle': '☘️', 'Vesce': '☘️', 'Mélilot': '☘️', 'Mélange d\'engrais vert': '☘️',

  // Fleurs
  'Tournesol': '🌻',
  'Dahlia': '🌸',
  'Cosmos': '🌸',
  'Zinnia': '🌸',
  'Tulipe': '🌷',
  'Renoncule': '🌷',
  'Anémone': '🌷',
  'Pivoine': '🌺',
  'Hibiscus': '🌺',
  'Lys en terre': '🌺',
  'Digitale': '🌸',
  'Delphinium': '🌸', 'Dauphinelle': '🌸',
  'Muflier': '🌸',
  'Lisianthus': '🌸',
  'Phlox': '🌸',
  'Nigelle': '🌸', 'Nielle': '🌸',
  'Pavot': '🌺', 'Pavot fruit': '🌺',
  'Calendule': '🌼', 'Tagète': '🌼',
  'Achillée millefeuille': '🌼',
  'Matricaire': '🌼',
  'Centaurée bleuet': '💐', 'Centaurée Aloha': '💐',
  'Ageratum': '💐',
  'Celosie': '🌸', 'Celosie à plumes': '🌸',
  'Statice': '💐',
  'Immortelle': '💐',
  'Gomphrena': '🌸',
  'Scabieuse': '💐', 'Scabieuse Fama': '💐',
  'Campanule': '🔔',
  'Dianthus': '🌸',
  'Godetie': '🌸',
  'Amarante': '🌸',
  'Pansée': '🌸',
  'Monarde': '🌸',
  'Rudbeckie': '🌻',
  'Eucalyptus': '🌿',
  'Lupin': '🌸',
  'Ancolie': '🌸',
  'Cobé': '🌸',
  'Giroflée': '🌸',
  'Lavatère': '🌸',
  'Lunaire': '🌙',
  'Saponaire': '🌸',
  'Lin à grandes fleurs': '🌸',
  'Nicotine': '🌸',
  'Orlaya': '🌸',
  'Ammi': '🌸', 'Ammi Dara': '🌸',
  'Buplèvre': '🌿',
  'Cerinthe': '🌿',
  'Cinéraire': '🌿',
  'Cloches d\'Irlande': '🔔',
  'Craspedia': '🌼',
  'Didiscus': '💐',
  'Eringium': '🌿',
  'Eremurus': '🌸',
  'Géranium': '🌸',
  'Mignonette': '🌸',
  'Myosotis chinois': '💙',
  'Asclépiade': '🌿',
  'Petite vigne ballon': '🎈',
  'Pois de senteur avec feuillage': '🌸',
  'Soupir de bébé': '☁️',
  'Talinum': '🌸',
  'Chou ornamental': '🥦',
  'Mélange de fleurs': '💐',

  // Divers
  'Mesclun (mix)': '🥗',
};

// Fallbacks par catégorie
const CATEGORY_FALLBACK = {
  LEGUME: '🥬',
  AROMATIQUE: '🌿',
  FRUIT: '🍎',
  FLEUR: '🌸',
};

/**
 * Retourne l'emoji correspondant à une espèce
 * @param {string} speciesName - Nom de l'espèce
 * @param {string} [category] - Catégorie (LEGUME, AROMATIQUE, FRUIT, FLEUR)
 * @returns {string} emoji
 */
export function getSpeciesIcon(speciesName, category) {
  if (speciesName && SPECIES_ICONS[speciesName]) return SPECIES_ICONS[speciesName];
  if (category && CATEGORY_FALLBACK[category]) return CATEGORY_FALLBACK[category];
  return '🌱';
}

export default SPECIES_ICONS;
