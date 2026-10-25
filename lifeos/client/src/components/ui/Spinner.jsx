export default function Spinner({ className = 'h-5 w-5', label = 'Loading' }) {
  return (
    <span role="status" aria-label={label} className={`inline-block animate-spin rounded-full border-2 border-indigo-500 border-t-transparent ${className}`} />
  );
}
