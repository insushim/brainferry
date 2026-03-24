import type { CategoryId, BasePuzzle } from './types';
import { generateRiverCrossing } from './river-crossing/generator';
import { generateEscort } from './escort-mission/generator';
import { generateBridgeTorch } from './bridge-torch/generator';
import { generateWaterJug } from './water-jug/generator';
import { generateHanoi } from './tower-hanoi/generator';
import { generateBodyguard } from './bodyguard/generator';
import { generateLogicGrid } from './logic-grid/generator';
import { generateSwitchLight } from './switch-light/generator';
import { generateBalanceScale } from './balance-scale/generator';
import { generateSequenceSort } from './sequence-sort/generator';

type GeneratorFn = (difficulty: number, seed: number) => BasePuzzle;

const GENERATORS: Record<CategoryId, GeneratorFn> = {
  'river-crossing': generateRiverCrossing,
  'escort-mission': generateEscort,
  'bridge-torch': generateBridgeTorch,
  'water-jug': generateWaterJug,
  'tower-hanoi': generateHanoi,
  'bodyguard': generateBodyguard,
  'logic-grid': generateLogicGrid,
  'switch-light': generateSwitchLight,
  'balance-scale': generateBalanceScale,
  'sequence-sort': generateSequenceSort,
};

export function generatePuzzle(category: CategoryId, difficulty: number, seed: number): BasePuzzle {
  return GENERATORS[category](difficulty, seed);
}
