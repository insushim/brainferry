'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateLogicGrid } from '@/engines/logic-grid/generator';
import {
  createInitialState,
  setMark,
  undo,
  type LogicGridState,
  type CellMark,
} from '@/engines/logic-grid/engine';
import { useAudio } from '@/hooks/useAudio';
import { Check, X as XIcon } from 'lucide-react';

interface LogicGridBoardProps {
  difficulty: number;
  seed: number;
  onComplete: (steps: number, optimal: number) => void;
  onFail?: (reason: string) => void;
}

export function LogicGridBoard({ difficulty, seed, onComplete, onFail }: LogicGridBoardProps) {
  const puzzle = useMemo(() => generateLogicGrid(difficulty, seed), [difficulty, seed]);
  const [state, setState] = useState<LogicGridState>(() => createInitialState(puzzle));
  const { playClick, playSuccess } = useAudio();

  useEffect(() => {
    if (state.isComplete) {
      playSuccess();
      onComplete(state.steps, puzzle.optimalSteps);
    }
  }, [state.isComplete, state.steps, puzzle.optimalSteps, onComplete, playSuccess]);

  const handleCellClick = useCallback(
    (catA: string, itemA: string, catB: string, itemB: string, currentMark: CellMark) => {
      if (state.isComplete) return;
      playClick();
      const nextMark: CellMark =
        currentMark === 'unknown' ? 'false' :
        currentMark === 'false' ? 'true' :
        'unknown';
      setState(setMark(state, catA, itemA, catB, itemB, nextMark, puzzle));
    },
    [state, puzzle, playClick],
  );

  const handleUndo = useCallback(() => {
    if (state.moveHistory.length === 0) return;
    playClick();
    setState(undo(state));
  }, [state, playClick]);

  const handleReset = useCallback(() => {
    playClick();
    setState(createInitialState(puzzle));
  }, [puzzle, playClick]);

  // Build subgrid pairs for rendering
  const gridPairs = useMemo(() => {
    const pairs: { key: string; catA: typeof puzzle.categories[0]; catB: typeof puzzle.categories[0] }[] = [];
    for (let i = 0; i < puzzle.categories.length; i++) {
      for (let j = i + 1; j < puzzle.categories.length; j++) {
        const key = `${puzzle.categories[i].id}:${puzzle.categories[j].id}`;
        pairs.push({ key, catA: puzzle.categories[i], catB: puzzle.categories[j] });
      }
    }
    return pairs;
  }, [puzzle.categories]);

  return (
    <div className="space-y-4">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-4 text-sm">
        <p className="font-medium mb-2">{puzzle.story}</p>
        <ul className="space-y-1 text-[var(--text-secondary)]">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-primary">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Clues */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
        <h3 className="font-bold text-accent text-sm mb-2">단서</h3>
        <ol className="space-y-1 list-decimal list-inside">
          {puzzle.clues.map((clue, i) => (
            <li key={i} className="text-sm text-[var(--text-secondary)]">{clue.text}</li>
          ))}
        </ol>
      </div>

      {/* Grid tables */}
      <div className="space-y-6 overflow-x-auto">
        {gridPairs.map(({ key, catA, catB }) => {
          const subGrid = state.grid[key];
          if (!subGrid) return null;

          return (
            <div key={key} className="inline-block min-w-full">
              <div className="text-sm font-bold text-[var(--text-secondary)] mb-2">
                {catA.name} vs {catB.name}
              </div>
              <table className="border-collapse">
                <thead>
                  <tr>
                    <th className="w-20 p-1" />
                    {catB.items.map((item) => (
                      <th key={item} className="p-1 text-xs font-medium text-[var(--text-secondary)] w-16 text-center">
                        {item}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {catA.items.map((rowItem) => (
                    <tr key={rowItem}>
                      <td className="p-1 text-xs font-medium text-[var(--text-secondary)] text-right pr-2">
                        {rowItem}
                      </td>
                      {catB.items.map((colItem) => {
                        const mark = subGrid[rowItem]?.[colItem] ?? 'unknown';
                        return (
                          <td key={colItem} className="p-0.5">
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => handleCellClick(catA.id, rowItem, catB.id, colItem, mark)}
                              className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                                mark === 'true'
                                  ? 'bg-success/20 border-success text-success'
                                  : mark === 'false'
                                  ? 'bg-error/10 border-error/30 text-error/60'
                                  : 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-primary/50'
                              }`}
                            >
                              {mark === 'true' && <Check className="w-4 h-4" />}
                              {mark === 'false' && <XIcon className="w-4 h-4" />}
                            </motion.button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={handleUndo}
          disabled={state.moveHistory.length === 0}
          className="px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold disabled:opacity-40 hover:bg-[var(--border)] transition-colors"
        >
          되돌리기
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold hover:bg-[var(--border)] transition-colors"
        >
          처음부터
        </button>
      </div>

      <div className="text-center text-sm text-[var(--text-secondary)]">
        마크: <span className="font-bold text-[var(--text)]">{state.steps}</span>
        {' / 최적: '}
        <span className="font-bold text-primary">{puzzle.optimalSteps}</span>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs text-[var(--text-secondary)]">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-[var(--bg-secondary)] border border-[var(--border)] inline-block" /> 미확인
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-error/10 border border-error/30 inline-flex items-center justify-center text-error"><XIcon className="w-3 h-3" /></span> 아님
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-success/20 border border-success inline-flex items-center justify-center text-success"><Check className="w-3 h-3" /></span> 맞음
        </span>
      </div>
    </div>
  );
}
