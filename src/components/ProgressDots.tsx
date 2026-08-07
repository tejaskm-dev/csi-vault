interface ProgressDotsProps {
  total: number;
  current: number;
  solved?: number[];
}

export function ProgressDots({ total, current, solved = [] }: ProgressDotsProps) {
  return (
    <div>
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const state = solved.includes(step)
          ? "solved"
          : step === current
            ? "current"
            : "todo";
        return <span key={step} data-state={state} />;
      })}
    </div>
  );
}
