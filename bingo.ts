import { buzz } from "./utils";
export { buzz };

export type Letter = "B" | "I" | "N" | "G" | "O";
export const LETTERS: Letter[] = ["B", "I", "N", "G", "O"];

export const COLUMN_RANGES: [number, number][] = [
  [1, 15],
  [16, 30],
  [31, 45],
  [46, 60],
  [61, 75],
];

export const MAX_NUMBER = 75;

export interface Cell {
  id?: string;
  row: number;
  col: number;
  letter: Letter;
  value: number | "FREE";
  marked: boolean;
}

export function letterFor(num: number): Letter {
  if (num <= 15) return "B";
  if (num <= 30) return "I";
  if (num <= 45) return "N";
  if (num <= 60) return "G";
  return "O";
}

export function getLetterForNumber(num: number): Letter {
  return letterFor(num);
}

// Deterministic Cartela Generator for ticket numbers (1 - 550)
export function generateBoardForTicket(ticketId: number): Cell[] {
  let seed = (ticketId * 1234567) >>> 0;
  function nextRand() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  nextRand();
  nextRand();
  nextRand();

  function getCol(min: number, max: number): number[] {
    const arr: number[] = [];
    while (arr.length < 5) {
      const val = Math.floor(nextRand() * (max - min + 1)) + min;
      if (!arr.includes(val)) arr.push(val);
    }
    return arr.sort((a, b) => a - b);
  }

  const columns: number[][] = [
    getCol(1, 15),
    getCol(16, 30),
    getCol(31, 45),
    getCol(46, 60),
    getCol(61, 75),
  ];

  const cells: Cell[] = [];

  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const cellId = `cell-${ticketId}-${r}-${c}`;
      if (r === 2 && c === 2) {
        cells.push({
          id: cellId,
          row: r,
          col: c,
          letter: LETTERS[c]!,
          value: "FREE",
          marked: true,
        });
      } else {
        cells.push({
          id: cellId,
          row: r,
          col: c,
          letter: LETTERS[c]!,
          value: columns[c]![r]!,
          marked: false,
        });
      }
    }
  }

  return cells;
}

export function generateFixedCard(ticketId: number): Cell[] {
  return generateBoardForTicket(ticketId);
}

export function generateCard(ticketId: number): Cell[] {
  return generateBoardForTicket(ticketId);
}

export function randomDraw(drawn: number[]): number {
  const available: number[] = [];
  for (let i = 1; i <= MAX_NUMBER; i++) {
    if (!drawn.includes(i)) {
      available.push(i);
    }
  }
  if (available.length === 0) return 0;
  const idx = Math.floor(Math.random() * available.length);
  return available[idx]!;
}

// Standard 75-ball Bingo winning pattern verification
export function checkBingo(cells: Cell[]): boolean {
  const grid: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));

  cells.forEach((cell) => {
    grid[cell.row]![cell.col] = cell.marked || cell.value === "FREE";
  });

  // Check 5 Rows
  for (let r = 0; r < 5; r++) {
    if (grid[r]!.every(Boolean)) return true;
  }

  // Check 5 Columns
  for (let c = 0; c < 5; c++) {
    let colFull = true;
    for (let r = 0; r < 5; r++) {
      if (!grid[r]![c]) {
        colFull = false;
        break;
      }
    }
    if (colFull) return true;
  }

  // Check Diagonal 1 (\)
  let diag1 = true;
  for (let i = 0; i < 5; i++) {
    if (!grid[i]![i]) {
      diag1 = false;
      break;
    }
  }
  if (diag1) return true;

  // Check Diagonal 2 (/)
  let diag2 = true;
  for (let i = 0; i < 5; i++) {
    if (!grid[i]![4 - i]) {
      diag2 = false;
      break;
    }
  }
  if (diag2) return true;

  // Check 4 Corners
  if (grid[0]![0] && grid[0]![4] && grid[4]![0] && grid[4]![4]) {
    return true;
  }

  return false;
}
