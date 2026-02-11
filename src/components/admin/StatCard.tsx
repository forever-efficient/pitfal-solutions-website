interface StatCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

export function StatCard({ label, value, highlight }: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border p-6 ${
        highlight ? 'border-primary-200 bg-primary-50' : 'border-neutral-200'
      }`}
    >
      <p className="text-sm text-neutral-500 mb-1">{label}</p>
      <p
        className={`text-3xl font-bold ${
          highlight ? 'text-primary-700' : 'text-neutral-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
