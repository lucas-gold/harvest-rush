/** Uniform grid index over static (x, y) points, so proximity queries
 * (crop pickup, bot targeting) only check the handful of cells near a
 * point instead of linearly scanning every crop in the room every tick —
 * with coverage-based spawning putting up to ~2k crops in a room, an
 * O(players × crops) scan would be real cost on a tiny shared-vCPU box. */
export class SpatialGrid<T extends { id: string; x: number; y: number }> {
  private cellSize: number;
  private cells = new Map<string, Map<string, T>>();
  private itemCell = new Map<string, string>();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private keyFor(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }

  add(item: T) {
    const key = this.keyFor(item.x, item.y);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = new Map();
      this.cells.set(key, cell);
    }
    cell.set(item.id, item);
    this.itemCell.set(item.id, key);
  }

  remove(id: string) {
    const key = this.itemCell.get(id);
    if (key === undefined) return;
    const cell = this.cells.get(key);
    if (cell) {
      cell.delete(id);
      if (cell.size === 0) this.cells.delete(key);
    }
    this.itemCell.delete(id);
  }

  clear() {
    this.cells.clear();
    this.itemCell.clear();
  }

  /** All items in cells that could possibly be within `radius` of (x, y) —
   * callers still need to do their own exact distance check, this just
   * narrows the candidate set. */
  *near(x: number, y: number, radius: number): IterableIterator<T> {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.cells.get(`${cx},${cy}`);
        if (!cell) continue;
        for (const item of cell.values()) yield item;
      }
    }
  }
}
