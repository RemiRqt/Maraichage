// Correspondance des statuts de plantation avec leurs libellés français
const STATUS_LABELS = {
  PLANIFIE: 'Planifié',
  SEME: 'Semé',
  EN_PEPINIERE: 'En pépinière',
  TRANSPLANTE: 'Transplanté',
  EN_CROISSANCE: 'En croissance',
  EN_RECOLTE: 'En récolte',
  TERMINE: 'Terminé',
  ECHEC: 'Échec',
};

export default function StatusBadge({ status }) {
  const label = STATUS_LABELS[status] ?? status ?? 'Inconnu';

  return (
    <span
      className={`badge status-${status}`}
      aria-label={`Statut : ${label}`}
    >
      {label}
    </span>
  );
}
