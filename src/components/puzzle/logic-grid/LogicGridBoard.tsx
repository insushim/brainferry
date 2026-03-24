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
import { Check, X as XIcon, BookOpen } from 'lucide-react';

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
      {/* Story */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-sm">
        <p className="font-medium mb-2 text-slate-100">{puzzle.story}</p>
        <ul className="space-y-1 text-slate-400">
          {puzzle.rules.map((rule, i) => (
            <li key={i} className="flex gap-2"><span className="text-blue-400">•</span>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Clues */}
      <div className="bg-purple-500/10 border border-purple-400/20 rounded-2xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-purple-400 text-sm uppercase tracking-wider">단서</h3>
        </div>
        <ol className="space-y-1.5 list-decimal list-inside">
          {puzzle.clues.map((clue, i) => (
            <li key={i} className="text-sm text-slate-400 leading-relaxed">{clue.text}</li>
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
              <div className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                {catA.name} vs {catB.name}
              </div>
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
                <table className="border-collapse w-full">
                  <thead>
                    <tr>
                      <th className="w-24 p-2" />
                      {catB.items.map((item) => (
                        <th key={item} className="p-2 text-xs font-semibold text-slate-500 text-center border-b border-white/5">
                          {item}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catA.items.map((rowItem) => (
                      <tr key={rowItem} className="border-b border-white/5 last:border-b-0">
                        <td className="p-2 text-xs font-semibold text-slate-400 text-right pr-3">
                          {rowItem}
                        </td>
                        {catB.items.map((colItem) => {
                          const mark = subGrid[rowItem]?.[colItem] ?? 'unknown';
                          return (
                            <td key={colItem} className="p-1 text-center">
                              <motion.button
                                whileTap={{ scale: 0.85 }}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => handleCellClick(catA.id, rowItem, catB.id, colItem, mark)}
                                className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all duration-200 ${
                                  mark === 'true'
                                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-400 shadow-sm shadow-emerald-500/10'
                                    : mark === 'false'
                                    ? 'bg-red-500/10 border-red-400/20 text-red-400/60'
                                    : 'bg-white/5 border-white/10 hover:border-blue-400/40 hover:bg-blue-500/5'
                                }`}
                              >
                                {mark === 'true' && <Check className="w-5 h-5" />}
                                {mark === 'false' && <XIcon className="w-5 h-5" />}
                              </motion.button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleUndo} disabled={state.moveHistory.length === 0}
          className="px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-sm text-slate-400 font-semibold disabled:opacity-30 hover:bg-white/10 transition-all border border-white/5">
          되돌리기
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleReset}
          className="px-5 py-3 rounded-2xl bg-white/5 backdrop-blur-sm text-slate-400 font-semibold hover:bg-white/10 transition-all border border-white/5">
          처음부터
        </motion.button>
      </div>

      {/* Steps pill */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-sm">
          <span className="text-slate-400">마크</span>
          <span className="font-bold text-slate-100 tabular-nums">{state.steps}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400">최적</span>
          <span className="font-bold text-blue-400 tabular-nums">{puzzle.optimalSteps}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-lg bg-white/5 border border-white/10 inline-block" /> 미확인
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-lg bg-red-500/10 border border-red-400/20 inline-flex items-center justify-center text-red-400/60"><XIcon className="w-3 h-3" /></span> 아님
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 inline-flex items-center justify-center text-emerald-400"><Check className="w-3 h-3" /></span> 맞음
        </span>
      </div>
    </div>
  );
}
