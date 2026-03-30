import { SeededRandom } from '../seeded-random';
import { BasePuzzle } from '../types';
import { solveLogicGrid } from './solver';

export type LogicVariant = 'basic' | 'ordering' | 'liar' | 'conditional';

export type LogicClue = {
  type: 'direct_match' | 'negation' | 'relation_negation' | 'ordering' | 'adjacent' | 'liar' | 'conditional';
  text: string;
  data: Record<string, string>;
};

export interface LogicGridPuzzle extends BasePuzzle {
  category: 'logic-grid';
  variant: LogicVariant;
  gridSize: number;
  categories: { id: string; name: string; items: string[] }[];
  clues: LogicClue[];
  // ordering variant: one category has a numeric ordering
  orderingCategory?: string; // category id that has ordering
  orderingValues?: number[]; // ordered values for each item index in that category
  // liar variant: one clue is false
  liarClueIndex?: number; // index of the false clue
  // conditional variant: some clues only apply if a condition is met
  conditionalClues?: { condition: LogicClue; then: LogicClue }[];
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

function getVariant(difficulty: number, rng: SeededRandom): LogicVariant {
  if (difficulty <= 3) return 'basic';
  if (difficulty <= 5) return rng.pick(['basic', 'ordering']);
  if (difficulty <= 7) return rng.pick(['ordering', 'liar']);
  return rng.pick(['liar', 'conditional']);
}

function getGridSize(difficulty: number, seed: number): number {
  if (difficulty <= 3) {
    const options = [3, 4];
    return options[seed % options.length];
  }
  if (difficulty <= 6) return 4;
  return 5;
}

function getCategoryCount(difficulty: number): number {
  if (difficulty <= 2) return 3;
  if (difficulty <= 4) return 3;
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
    case 'ordering':
      if (d.relation === 'before') {
        return `${d.itemA}은(는) ${d.itemB}보다 앞 순서입니다.`;
      } else if (d.relation === 'after') {
        return `${d.itemA}은(는) ${d.itemB}보다 뒤 순서입니다.`;
      } else {
        return `${d.itemA}은(는) ${d.itemB}과(와) 인접합니다.`;
      }
    case 'liar':
      return `🤥 [거짓 가능] ${d.text}`;
    case 'conditional':
      return `만약 ${d.condition}이라면, ${d.then}`;
    default:
      return '';
  }
}

export function generateLogicGrid(difficulty: number, seed: number): LogicGridPuzzle {
  const maxRetries = 50;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rng = new SeededRandom(seed + attempt);
    const variant = getVariant(difficulty, rng);
    const gridSize = getGridSize(difficulty, seed);
    const catCount = getCategoryCount(difficulty);

    // Deterministic category rotation
    const availableCats = CATEGORY_TEMPLATES.slice(1);
    const catStartIdx = seed % availableCats.length;
    const selectedExtraCats = Array.from({ length: catCount - 1 }, (_, i) =>
      availableCats[(catStartIdx + i) % availableCats.length]
    );
    const selectedCatTemplates = [
      CATEGORY_TEMPLATES[0], // person always first
      ...selectedExtraCats,
    ];

    const categories = selectedCatTemplates.map(t => ({
      id: t.id,
      name: t.name,
      items: rng.pickN(t.pool, gridSize),
    }));

    // Step 1: Generate answer (random permutation mapping)
    const solution: Record<string, Record<string, string>> = {};
    const primaryItems = categories[0].items;

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

          allClues.push({
            type: 'direct_match',
            text: '',
            data: { catA: catA.id, itemA, catB: catB.id, itemB },
          });

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

    // Ordering clues for ordering variant
    let orderingCategory: string | undefined;
    let orderingValues: number[] | undefined;
    if (variant === 'ordering') {
      const orderingCatIdx = rng.int(1, categories.length - 1);
      const orderingCat = categories[orderingCatIdx];
      orderingCategory = orderingCat.id;
      // Assign ordering values based on solution row
      orderingValues = [];
      for (let row = 0; row < gridSize; row++) {
        orderingValues.push(row + 1);
      }

      for (let i = 0; i < gridSize; i++) {
        for (let j = i + 1; j < gridSize; j++) {
          const personI = primaryItems[i];
          const personJ = primaryItems[j];
          const itemI = solution[personI][orderingCat.id];
          const itemJ = solution[personJ][orderingCat.id];

          allClues.push({
            type: 'ordering',
            text: '',
            data: {
              catA: categories[0].id, itemA: personI,
              catB: categories[0].id, itemB: personJ,
              relation: 'before',
              orderCat: orderingCat.id,
            },
          });
        }
      }
    }

    const shuffledClues = rng.shuffle(allClues);

    // Step 3: Select clues
    const directClues = shuffledClues.filter(c => c.type === 'direct_match');
    const negationClues = shuffledClues.filter(c => c.type === 'negation');
    const orderingClues = shuffledClues.filter(c => c.type === 'ordering');

    let selectedClues: LogicClue[] = [];

    const directCount = Math.max(1, Math.floor(gridSize * (catCount - 1) * (difficulty <= 3 ? 0.6 : 0.3)));
    const directSubset = directClues.slice(0, directCount);
    selectedClues.push(...directSubset);

    // Add ordering clues if present
    if (orderingClues.length > 0) {
      const orderCount = Math.min(2, orderingClues.length);
      selectedClues.push(...orderingClues.slice(0, orderCount));
    }

    // Add negation clues until we have a unique solution
    for (const clue of negationClues) {
      selectedClues.push(clue);

      const testPuzzle: LogicGridPuzzle = {
        seed,
        difficulty,
        category: 'logic-grid',
        variant,
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
    let finalClues = selectedClues.map(c => ({
      ...c,
      text: generateClueText(c),
    }));

    // Liar variant: mark one clue as potentially false
    let liarClueIndex: number | undefined;
    if (variant === 'liar' && finalClues.length >= 3) {
      // Pick a negation clue and make it a liar (actually true — but we flip it to confuse)
      const negIdxes = finalClues
        .map((c, i) => c.type === 'negation' ? i : -1)
        .filter(i => i >= 0);
      if (negIdxes.length > 0) {
        liarClueIndex = rng.pick(negIdxes);
        // The liar clue is marked. It is still a valid clue, but the player
        // is told "one of these clues might be false" — actually all clues are
        // true, but the liar-marked one is presented with the 🤥 label to add
        // a red herring challenge. The player must figure out which clue is
        // the "suspected liar" and verify it's actually true.
        finalClues[liarClueIndex] = {
          ...finalClues[liarClueIndex],
          type: 'liar' as const,
          text: `🤥 [거짓 가능] ${finalClues[liarClueIndex].text}`,
          data: { ...finalClues[liarClueIndex].data, text: finalClues[liarClueIndex].text },
        };
      }
    }

    // Conditional variant: wrap some clues as conditionals
    const conditionalClues: { condition: LogicClue; then: LogicClue }[] = [];
    if (variant === 'conditional' && directClues.length >= 2) {
      // Take 1-2 direct clues and make them conditional
      const condCount = Math.min(2, Math.floor(finalClues.length / 3));
      for (let ci = 0; ci < condCount && ci < finalClues.length; ci++) {
        const thenClue = finalClues[ci];
        if (thenClue.type !== 'direct_match') continue;
        // Create a condition that is true (so the "then" clue still holds)
        const condDirect = directClues.find(dc =>
          dc.data.itemA !== thenClue.data.itemA && dc.data.itemB !== thenClue.data.itemB
        );
        if (condDirect) {
          conditionalClues.push({
            condition: { ...condDirect, text: generateClueText(condDirect) },
            then: thenClue,
          });
          finalClues[ci] = {
            type: 'conditional',
            text: `만약 ${condDirect.data.itemA}이(가) ${condDirect.data.itemB}이라면, ${thenClue.data.itemA}은(는) ${thenClue.data.itemB}입니다.`,
            data: {
              condition: `${condDirect.data.itemA}이(가) ${condDirect.data.itemB}`,
              then: `${thenClue.data.itemA}은(는) ${thenClue.data.itemB}`,
              condCatA: condDirect.data.catA,
              condItemA: condDirect.data.itemA,
              condCatB: condDirect.data.catB,
              condItemB: condDirect.data.itemB,
              thenCatA: thenClue.data.catA,
              thenItemA: thenClue.data.itemA,
              thenCatB: thenClue.data.catB,
              thenItemB: thenClue.data.itemB,
            },
          };
        }
      }
    }

    // Verify the final puzzle has a unique solution
    const puzzle: LogicGridPuzzle = {
      seed,
      difficulty,
      category: 'logic-grid',
      variant,
      optimalSteps: finalClues.length,
      story: '',
      rules: [],
      hints: [],
      gridSize,
      categories,
      clues: finalClues,
      orderingCategory: variant === 'ordering' ? orderingCategory : undefined,
      orderingValues: variant === 'ordering' ? orderingValues : undefined,
      liarClueIndex: variant === 'liar' ? liarClueIndex : undefined,
      conditionalClues: variant === 'conditional' ? conditionalClues : undefined,
      solution,
    };

    const finalResult = solveLogicGrid(puzzle);
    if (!finalResult.solvable || !finalResult.uniqueSolution) continue;

    // Try to minimize: remove clues one by one
    const minimized = [...finalClues];
    const toTry = rng.shuffle([...Array(minimized.length).keys()]);
    for (const idx of toTry) {
      if (minimized.length <= gridSize) break;
      const removed = minimized.splice(idx, 1)[0];
      const testPuzzle2: LogicGridPuzzle = { ...puzzle, clues: minimized };
      const testResult = solveLogicGrid(testPuzzle2);
      if (!testResult.uniqueSolution) {
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
    let storyExtra = '';
    if (variant === 'basic') {
      storyExtra = ' 기본적인 논리 추론으로 해결할 수 있습니다.';
    } else if (variant === 'ordering') {
      storyExtra = ' 순서 관계 단서가 포함되어 있어 더 복잡한 추론이 필요합니다!';
    } else if (variant === 'liar') {
      storyExtra = ' ⚠️ 단서 중 하나가 거짓일 수 있습니다! 신중하게 검증하세요!';
    } else if (variant === 'conditional') {
      storyExtra = ' ⚠️ 일부 단서는 조건부입니다! 조건을 만족할 때만 적용됩니다!';
    }
    puzzle.story = `${gridSize}명의 사람들에 대한 정보를 논리적으로 추리하세요. 각 사람의 ${catNames}을(를) 단서를 통해 알아내야 합니다.${storyExtra}`;

    puzzle.rules = [
      `${gridSize}명의 사람과 ${catCount}개의 범주가 있습니다.`,
      '각 범주의 항목은 정확히 한 사람에게만 해당됩니다.',
      '단서를 분석하여 모든 조합을 찾으세요.',
      '확실한 것부터 표시하고, 소거법을 활용하세요.',
    ];

    if (variant === 'ordering') {
      puzzle.rules.push('⚠️ 순서 단서: "A가 B보다 앞 순서" = A의 번호가 B보다 작음');
    }
    if (variant === 'liar') {
      puzzle.rules.push('⚠️ 🤥 표시된 단서는 거짓일 수 있습니다. 다른 단서로 검증하세요!');
    }
    if (variant === 'conditional') {
      puzzle.rules.push('⚠️ 조건부 단서: 조건이 참일 때만 결론이 성립합니다.');
    }

    puzzle.hints = [
      `총 ${minimized.length}개의 단서가 있습니다.`,
    ];

    const directInFinal = minimized.filter(c => c.type === 'direct_match');
    const liarInFinal = minimized.filter(c => c.type === 'liar');
    const conditionalInFinal = minimized.filter(c => c.type === 'conditional');
    const orderingInFinal = minimized.filter(c => c.type === 'ordering');

    if (variant === 'basic') {
      if (directInFinal.length > 0) {
        puzzle.hints.push(`"~은(는) ~이다" 형태의 직접 단서부터 시작하세요.`);
      }
      puzzle.hints.push('소거법: 한 칸이 확정되면 같은 행과 열의 나머지를 제거하세요.');
      puzzle.hints.push('단계별로 차근차근 진행하면 해결할 수 있습니다.');
    } else if (variant === 'ordering') {
      puzzle.hints.push('순서 관계를 먼저 파악하여 가능한 위치를 좁히세요.');
      if (orderingInFinal.length > 0) {
        puzzle.hints.push(`${orderingInFinal.length}개의 순서 단서가 중요한 열쇠입니다.`);
      }
      puzzle.hints.push('"A가 B보다 앞 순서"라는 것은 A의 번호가 B보다 작다는 의미입니다.');
    } else if (variant === 'liar') {
      puzzle.hints.push('먼저 의심스럽지 않은 단서들로 격자를 최대한 채워보세요.');
      if (liarInFinal.length > 0) {
        puzzle.hints.push('🤥 표시된 단서는 거짓일 가능성이 있으니 다른 단서로 검증하세요.');
      }
      puzzle.hints.push('모든 단서를 믿으면 모순이 생기는지 확인해보세요.');
    } else if (variant === 'conditional') {
      puzzle.hints.push('조건부 단서의 조건부터 먼저 확인하세요.');
      if (conditionalInFinal.length > 0) {
        puzzle.hints.push(`${conditionalInFinal.length}개의 조건부 단서가 있습니다. "만약...라면"을 주의 깊게 읽으세요.`);
      }
      puzzle.hints.push('조건이 참일 때만 결론이 성립한다는 점을 기억하세요.');
    }

    // Common hints for all variants
    if (directInFinal.length > 0 && variant !== 'basic') {
      puzzle.hints.push('직접 단서("~은(는) ~이다")를 먼저 처리하면 도움이 됩니다.');
    }

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
    variant: 'basic',
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
