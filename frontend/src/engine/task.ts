// src/engine/task.ts
export abstract class Task {
  /** Her tick/çağrıda bir adım ilerlet. */
  abstract run_next(): void;
  /** Opsiyonel: Bittiyse true döndür. Engine bu görevi otomatik temizler. */
  is_done?(): boolean;
}
