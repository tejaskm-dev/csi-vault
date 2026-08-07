interface CountdownPillProps {
  time: number; // seconds
  className?: string;
}

export function CountdownPill({ time }: CountdownPillProps) {
  const mins = Math.floor(Math.max(time, 0) / 60);
  const secs = Math.max(time, 0) % 60;
  const formatted = `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;

  return <div data-urgent={time <= 10 ? "true" : undefined}>{formatted}</div>;
}
