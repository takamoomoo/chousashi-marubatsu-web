interface Props {
  rate: number; // 0-100
}

export function ProgressBar({ rate }: Props) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className="bg-gradient-to-r from-blue-500 to-emerald-500 h-3 rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, rate)}%` }}
      />
    </div>
  );
}
