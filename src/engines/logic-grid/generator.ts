import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveLogicGrid } from './solver';

export type LogicClue = {
  type: 'direct_match' | 'negation' | 'relation_negation' | 'ordering' | 'adjacent';
  text: string;
  data: Record<string, string>;
};

export interface LogicGridPuzzle extends BasePuzzle {
  category: 'logic-grid';
  gridSize: number;
  categories: { id: string; name: string; items: string[] }[];
  clues: LogicClue[];
  solution: Record<string, Record<string, string>>;
}

// ── Category Pools ──

const PEOPLE_POOL = ['민수', '지영', '현우', '수진', '태호', '미래', '준서', '하은', '도윤', '서연'];
const JOB_POOL = ['의사', '교사', '요리사', '예술가', '엔지니어', '경찰관', '소방관', '작가', '음악가', '운동선수'];
const COLOR_POOL = ['빨강', '파랑', '초록', '노랑', '보라', '주황', '분홍', '하양', '검정', '갈색'];
const FOOD_POOL = ['피자', '초밥', '파스타', '햄버거', '비빔밥', '떡볶이', '김밥', '치킨', '라면', '샐러드'];
const PET_POOL = ['강아지', '고양이', '토끼', '햄스터', '앵무새', '거북이', '물고기', '이구아나'];
const CITY_POOL = ['서울', '부산', '대구', '인천', '광주', '대전', '제주', '수원', '전주', '경주'];

const CATEGORY_TEMPLATES = [
  { id: 'person', name: '이름', pool: PEOPLE_POOL },
  { id: 'job', name: '직업', pool: JOB_POOL },
  { id: 'color', name: '좋아하는 색', pool: COLOR_POOL },
  { id: 'food', name: '좋아하는 음식', pool: FOOD_POOL },
  { id: 'pet', name: '반려동물', pool: PET_POOL },
  { id: 'city', name: '출신 도시', pool: CITY_POOL },
];

function getGridSize(difficulty: number): number {
  if (difficulty <= 3) return 3;
  if (difficulty <= 6) return 4;
  return 5;
}

function getCategoryCount(difficulty: number): number {
  if (difficulty <= 2) return 3;
  if (difficulty <= 5) return 3;
  if (difficulty <= 7) return 4;
  return 4;
}

function generateClueText(clue: LogicClue): string {
  const d = clue.data;
  switch (clue.type) {
    case 'direct_match':
      return `${d.itemA}은(는) ${d.itemB}입니다.`;
    case 'negation':
      return `${d.itemA}은(는) ${d.itemB}이(가) 아닙니다.`;
    case 'relation_negation':
      return `${d.itemA}은(는) ${d.itemB}이(가) 아닙니다.`;
    default:
      return '';
  }
}

export function generateLogicGrid(difficulty: number, seed: number): LogicGridPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const gridSize = getGridSize(difficulty);
    const catCount = getCategoryCount(difficulty);

    // Always start with people as primary category
    const selectedCatTemplates = [
      CATEGORY_TEMPLATES[0], // person always first
      ...rng.pickN(CATEGORY_TEMPLATES.slice(1), catCount - 1),
    ];

    const categories = selectedCatTemplates.map(t => ({
      id: t.id,
      name: t.name,
      items: rng.pickN(t.pool, gridSize),
    }));

    // Step 1: Generate answer (random permutation mapping)
    const solution: Record<string, Record<string, string>> = {};
    const primaryItems = categories[0].items;

    // For each non-primary category, create a random mapping
    const mappings: Record<string, string[]> = {};
    for (let i = 1; i < categories.length; i++) {
      mappings[categories[i].id] = rng.shuffle(categories[i].items);
    }

    for (let row = 0; row < gridSize; row++) {
      const person = primaryItems[row];
      solution[person] = { [categories[0].id]: person };
      for (let i = 1; i < categories.length; i++) {
        solution[person][categories[i].id] = mappings[categories[i].id][row];
      }
    }

    // Step 2: Generate all possible clues from the answer
    const allClues: LogicClue[] = [];

    // Direct matches between categories
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const catA = categories[i];
        const catB = categories[j];

        for (const person of primaryItems) {
          const itemA = solution[person][catA.id];
          const itemB = solution[person][catB.id];

          // Direct match
          allClues.push({
            type: 'direct_match',
            text: '',
            data: { catA: catA.id, itemA, catB: catB.id, itemB },
          });

          // Negation clues (wrong pairings)
          for (const otherPerson of primaryItems) {
            if (otherPerson === person) continue;
            const otherItemB = solution[otherPerson][catB.id];
            allClues.push({
              type: 'negation',
              text: '',
              data: { catA: catA.id, itemA, catB: catB.id, itemB: otherItemB },
            });
          }
        }
      }
    }

    // Shuffle all clues
    const shuffledClues = rng.shuffle(allClues);

    // Step 3: Find a minimal set of clues that gives a unique solution
    // Start with all direct_match clues (as base) then remove one by one
    const directClues = shuffledClues.filter(c => c.type === 'direct_match');
    const negationClues = shuffledClues.filter(c => c.type === 'negation');

    // Begin with a small set of direct clues and add negation clues as needed
    let selectedClues: LogicClue[] = [];

    // Try using a mix of direct and negation clues
    // For easier puzzles, use more direct clues
    const directCount = Math.max(1, Math.floor(gridSize * (catCount - 1) * (difficulty <= 3 ? 0.6 : 0.3)));
    const directSubset = directClues.slice(0, directCount);
    selectedClues.push(...directSubset);

    // Add negation clues until we have a unique solution
    for (const clue of negationClues) {
      selectedClues.push(clue);

      const testPuzzle: LogicGridPuzzle = {
        seed,
        difficulty,
        category: 'logic-grid',
        optimalSteps: 0,
        story: '',
        rules: [],
        hints: [],
        gridSize,
        categories,
        clues: selectedClues.map(c => ({ ...c, text: generateClueText(c) })),
        solution,
      };

      const result = solveLogicGrid(testPuzzle);
      if (result.uniqueSolution) break;
    }

    // Generate clue texts
    const finalClues = selectedClues.map(c => ({
      ...c,
      text: generateClueText(c),
    }));

    // Verify the final puzzle has a unique solution
    const puzzle: LogicGridPuzzle = {
      seed,
      difficulty,
      category: 'logic-grid',
      optimalSteps: finalClues.length,
      story: '',
      rules: [],
      hints: [],
      gridSize,
      categories,
      clues: finalClues,
      solution,
    };

    const finalResult = solveLogicGrid(puzzle);
    if (!finalResult.solvable || !finalResult.uniqueSolution) continue;

    // Try to minimize: remove clues one by one
    const minimized = [...finalClues];
    const toTry = rng.shuffle([...Array(minimized.length).keys()]);
    for (const idx of toTry) {
      if (minimized.length <= gridSize) break; // don't go below gridSize clues
      const removed = minimized.splice(idx, 1)[0];
      const testPuzzle2: LogicGridPuzzle = { ...puzzle, clues: minimized };
      const testResult = solveLogicGrid(testPuzzle2);
      if (!testResult.uniqueSolution) {
        // Put it back
        minimized.splice(idx, 0, removed);
      }
    }

    // For easier difficulties, add extra helpful clues
    if (difficulty <= 4) {
      const extraCount = Math.max(0, Math.floor((6 - difficulty) * 0.5));
      const extraClues = negationClues
        .filter(c => !minimized.some(m =>
          m.data.itemA === c.data.itemA && m.data.itemB === c.data.itemB && m.data.catA === c.data.catA
        ))
        .slice(0, extraCount)
        .map(c => ({ ...c, text: generateClueText(c) }));
      minimized.push(...extraClues);
    }

    puzzle.clues = minimized;
    puzzle.optimalSteps = minimized.length;

    // Generate story
    const catNames = categories.map(c => c.name).join(', ');
    puzzle.story = `${gridSize}명의 사람들에 대한 정보를 논리적으로 추리하세요. 각 사람의 ${catNames}을(를) 단서를 통해 알아내야 합니다.`;

    puzzle.rules = [
      `${gridSize}명의 사람과 ${catCount}개의 범주가 있습니다.`,
      '각 범주의 항목은 정확히 한 사람에게만 해당됩니다.',
      '단서를 분석하여 모든 조합을 찾으세요.',
      '확실한 것부터 표시하고, 소거법을 활용하세요.',
    ];

    puzzle.hints = [
      `총 ${minimized.length}개의 단서가 있습니다.`,
    ];
    const directInFinal = minimized.filter(c => c.type === 'direct_match');
    if (directInFinal.length > 0) {
      puzzle.hints.push(`"~은(는) ~이다" 형태의 직접 단서부터 시작하세요.`);
    }
    puzzle.hints.push('소거법: 한 칸이 확정되면 같은 행과 열의 나머지를 제거하세요.');

    return puzzle;
  }

  // Fallback: minimal 3x3 puzzle
  const categories = [
    { id: 'person', name: '이름', items: ['민수', '지영', '현우'] },
    { id: 'job', name: '직업', items: ['의사', '교사', '요리사'] },
    { id: 'color', name: '좋아하는 색', items: ['빨강', '파랑', '초록'] },
  ];
  const solution: Record<string, Record<string, string>> = {
    '민수': { person: '민수', job: '의사', color: '빨강' },
    '지영': { person: '지영', job: '교사', color: '파랑' },
    '현우': { person: '현우', job: '요리사', color: '초록' },
  };
  return {
    seed,
    difficulty,
    category: 'logic-grid',
    optimalSteps: 4,
    story: '3명의 사람들의 직업과 좋아하는 색을 알아내세요.',
    rules: [
      '3명의 사람과 3개의 범주가 있습니다.',
      '각 범주의 항목은 정확히 한 사람에게만 해당됩니다.',
    ],
    hints: ['직접 단서부터 시작하세요.'],
    gridSize: 3,
    categories,
    clues: [
      { type: 'direct_match', text: '민수은(는) 의사입니다.', data: { catA: 'person', itemA: '민수', catB: 'job', itemB: '의사' } },
      { type: 'direct_match', text: '지영은(는) 파랑입니다.', data: { catA: 'person', itemA: '지영', catB: 'color', itemB: '파랑' } },
      { type: 'negation', text: '현우은(는) 의사이(가) 아닙니다.', data: { catA: 'person', itemA: '현우', catB: 'job', itemB: '의사' } },
      { type: 'negation', text: '민수은(는) 파랑이(가) 아닙니다.', data: { catA: 'person', itemA: '민수', catB: 'color', itemB: '파랑' } },
    ],
    solution,
  };
}
