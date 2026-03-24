export interface SolverConfig<State, Move> {
  initialState: State;
  isGoal: (state: State) => boolean;
  isFailed?: (state: State) => boolean;
  getMoves: (state: State) => Move[];
  applyMove: (state: State, move: Move) => State;
  serialize: (state: State) => string;
  maxDepth?: number;
}

export interface SolverResult<Move> {
  solvable: boolean;
  moves: Move[];
  statesExplored: number;
}

export function bfsSolve<State, Move>(
  config: SolverConfig<State, Move>
): SolverResult<Move> {
  const {
    initialState,
    isGoal,
    isFailed,
    getMoves,
    applyMove,
    serialize,
    maxDepth = 100,
  } = config;

  if (isGoal(initialState)) {
    return { solvable: true, moves: [], statesExplored: 1 };
  }

  const visited = new Set<string>();
  const queue: { state: State; moves: Move[] }[] = [
    { state: initialState, moves: [] },
  ];
  visited.add(serialize(initialState));
  let explored = 0;

  while (queue.length > 0) {
    const { state, moves } = queue.shift()!;
    explored++;

    if (moves.length >= maxDepth) continue;

    for (const move of getMoves(state)) {
      const newState = applyMove(state, move);
      const key = serialize(newState);

      if (visited.has(key)) continue;
      if (isFailed && isFailed(newState)) continue;

      const newMoves = [...moves, move];

      if (isGoal(newState)) {
        return { solvable: true, moves: newMoves, statesExplored: explored };
      }

      visited.add(key);
      queue.push({ state: newState, moves: newMoves });
    }
  }

  return { solvable: false, moves: [], statesExplored: explored };
}
