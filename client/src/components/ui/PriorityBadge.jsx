// Correspondance des priorités avec leurs libellés français
const PRIORITY_LABELS = {
  BASSE: 'Basse',
  NORMALE: 'Normale',
  HAUTE: 'Haute',
  URGENTE: 'Urgente',
};

export default function PriorityBadge({ priority }) {
  const label = PRIORITY_LABELS[priority] ?? priority ?? 'Inconnue';

  return (
    <span
      className={`badge priority-${priority}`}
      aria-label={`Priorité : ${label}`}
    >
      {label}
    </span>
  );
}
