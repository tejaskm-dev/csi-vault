interface StatBlockProps {
  number: string | number;
  label: string;
  tone?: "light" | "dark";
  className?: string;
}

export function StatBlock({ number, label, tone }: StatBlockProps) {
  return (
    <div data-tone={tone ?? "light"}>
      <span>{number}</span>
      <span>{label}</span>
    </div>
  );
}
