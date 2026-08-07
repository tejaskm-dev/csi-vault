interface LeaderboardRowProps {
  id: string;
  rank: number;
  name: string;
  initials: string;
  digits: number;
  isYou?: boolean;
  delta?: number;
}

export function LeaderboardRow({ rank, name, initials, digits, isYou, delta }: LeaderboardRowProps) {
  return (
    <div data-you={isYou ? "true" : undefined}>
      <span>{rank}</span>
      <span>{initials}</span>
      <span>{name}</span>
      {delta ? <span>+{delta}</span> : null}
      <span>{digits}/9</span>
    </div>
  );
}
