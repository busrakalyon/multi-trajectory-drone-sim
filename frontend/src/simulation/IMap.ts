// simulation/IMap.ts
export interface IMap {
  /** Sistemi dt saniye ilerletir */
  update(dt: number): void;
  /** Opsiyonel: görselleştirme veya log */
  render?(): void;
}
