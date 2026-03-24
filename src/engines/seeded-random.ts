// Mulberry32 알고리즘 — 빠르고 분포 균일한 시드 기반 PRNG
// 같은 시드 → 같은 난수열 → 같은 퍼즐 (일일 챌린지에 필수)
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  pickN<T>(arr: readonly T[], n: number): T[] {
    const copy = [...arr];
    const result: T[] = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
      const idx = this.int(0, copy.length - 1);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  boolean(probability = 0.5): boolean {
    return this.next() < probability;
  }

  static fromDate(date: Date): SeededRandom {
    const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      const char = dateStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return new SeededRandom(Math.abs(hash));
  }

  static fromDateAndCategory(date: Date, category: string): SeededRandom {
    const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${category}`;
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      const char = dateStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return new SeededRandom(Math.abs(hash));
  }
}
