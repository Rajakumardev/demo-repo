export default function CategoryBadge({ name, color }) {
  if (!name) return <span className="cell-muted">Uncategorised</span>;
  return (
    <span className="badge">
      <span className="color-dot" style={{ background: color || '#94a3b8' }} />
      {name}
    </span>
  );
}
