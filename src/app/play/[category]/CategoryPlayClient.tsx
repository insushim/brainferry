'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { CATEGORIES, type CategoryId } from '@/engines/types';
import { usePuzzleStore } from '@/stores/puzzle-store';
import { PuzzleShell } from '@/components/puzzle/PuzzleShell';
import { RiverCrossingBoard } from '@/components/puzzle/river-crossing/RiverCrossingBoard';
import { EscortMissionBoard } from '@/components/puzzle/escort-mission/EscortMissionBoard';
import { BridgeTorchBoard } from '@/components/puzzle/bridge-torch/BridgeTorchBoard';
import { WaterJugBoard } from '@/components/puzzle/water-jug/WaterJugBoard';
import { TowerHanoiBoard } from '@/components/puzzle/tower-hanoi/TowerHanoiBoard';
import { BodyguardBoard } from '@/components/puzzle/bodyguard/BodyguardBoard';
import { LogicGridBoard } from '@/components/puzzle/logic-grid/LogicGridBoard';
import { SwitchLightBoard } from '@/components/puzzle/switch-light/SwitchLightBoard';
import { BalanceScaleBoard } from '@/components/puzzle/balance-scale/BalanceScaleBoard';
import { SequenceSortBoard } from '@/components/puzzle/sequence-sort/SequenceSortBoard';

const BOARD_MAP: Record<CategoryId, React.ComponentType<{ difficulty: number; seed: number; onComplete: (steps: number, optimal: number) => void; onFail?: (reason: string) => void }>> = {
  'river-crossing': RiverCrossingBoard,
  'escort-mission': EscortMissionBoard,
  'bridge-torch': BridgeTorchBoard,
  'water-jug': WaterJugBoard,
  'tower-hanoi': TowerHanoiBoard,
  'bodyguard': BodyguardBoard,
  'logic-grid': LogicGridBoard,
  'switch-light': SwitchLightBoard,
  'balance-scale': BalanceScaleBoard,
  'sequence-sort': SequenceSortBoard,
};

export function CategoryPlayClient({ categoryId }: { categoryId: CategoryId }) {
  const categoryInfo = CATEGORIES.find((c) => c.id === categoryId)!;
  const difficulty = usePuzzleStore((s) => s.currentDifficulty);
  const startPuzzle = usePuzzleStore((s) => s.startPuzzle);
  const completePuzzle = usePuzzleStore((s) => s.completePuzzle);

  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2147483647));
  const [puzzleKey, setPuzzleKey] = useState(0);
  const [result, setResult] = useState<{ steps: number; optimal: number } | null>(null);
  const [failReason, setFailReason] = useState<string | null>(null);

  useEffect(() => {
    startPuzzle(categoryId, difficulty, seed);
  }, [categoryId, difficulty, seed, startPuzzle]);

  const handleComplete = useCallback((steps: number, optimal: number) => {
    completePuzzle(steps, optimal);
    setResult({ steps, optimal });
  }, [completePuzzle]);

  const handleFail = useCallback((reason: string) => {
    setFailReason(reason);
  }, []);

  const handleNewPuzzle = useCallback(() => {
    setSeed(Math.floor(Math.random() * 2147483647));
    setPuzzleKey((k) => k + 1);
    setResult(null);
    setFailReason(null);
  }, []);

  const handleReset = useCallback(() => {
    setPuzzleKey((k) => k + 1);
    setResult(null);
    setFailReason(null);
    startPuzzle(categoryId, difficulty, seed);
  }, [categoryId, difficulty, seed, startPuzzle]);

  const BoardComponent = BOARD_MAP[categoryId];

  const puzzleContent = useMemo(() => (
    <BoardComponent
      key={puzzleKey}
      difficulty={difficulty}
      seed={seed}
      onComplete={handleComplete}
      onFail={handleFail}
    />
  ), [puzzleKey, difficulty, seed, handleComplete, handleFail, BoardComponent]);

  return (
    <PuzzleShell
      categoryInfo={categoryInfo}
      result={result}
      failReason={failReason}
      onNewPuzzle={handleNewPuzzle}
      onReset={handleReset}
      onDismissFail={() => setFailReason(null)}
    >
      {puzzleContent}
    </PuzzleShell>
  );
}
