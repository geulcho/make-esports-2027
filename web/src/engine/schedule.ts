export function generateSRR(teamIds: string[]): [string, string][][] {
  const n = teamIds.length;
  const teams = [...teamIds];
  if (n % 2 !== 0) teams.push('BYE');
  const size = teams.length;
  const rounds: [string, string][][] = [];

  for (let r = 0; r < size - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < size / 2; i++) {
      const a = teams[i];
      const b = teams[size - 1 - i];
      if (a !== 'BYE' && b !== 'BYE') pairs.push([a, b]);
    }
    rounds.push(pairs);
    // rotate: keep teams[0] fixed, rotate the rest
    teams.splice(1, 0, teams.pop()!);
  }

  return rounds;
}

export function roundsToPhases(
  rounds: [string, string][][],
  numPhases: number,
): [string, string][][][] {
  const totalRounds = rounds.length;
  const phases: [string, string][][][] = Array.from({ length: numPhases }, () => []);
  const perPhase = Math.ceil(totalRounds / numPhases);

  rounds.forEach((round, i) => {
    const phaseIdx = Math.min(Math.floor(i / perPhase), numPhases - 1);
    phases[phaseIdx].push(round);
  });

  return phases;
}
