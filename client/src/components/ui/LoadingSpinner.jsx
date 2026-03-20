export default function LoadingSpinner({ size = 'md', label = 'Chargement...' }) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-10 w-10 border-4',
    lg: 'h-16 w-16 border-4',
  };

  return (
    <div
      className="flex flex-col items-center justify-center gap-3"
      role="status"
      aria-label={label}
    >
      <div
        className={`loading-spinner ${sizeClasses[size] || sizeClasses.md}`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
