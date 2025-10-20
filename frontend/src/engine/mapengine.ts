// src/engine/mapengine.ts
import { Task } from "./task";

export class MapEngine {
  private tasks: Task[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly tickMs = 20) {}

  addTask(task: Task) {
    this.tasks.push(task);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.timer = setInterval(() => this.run_tasks(), this.tickMs);
  }

  stop() {
    if (!this.running) return;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
  }

  private run_tasks() {
    if (!this.running) return;
    const snapshot = [...this.tasks];
    for (const t of snapshot) {
      try {
        t.run_next();
      } catch (e) {
        console.error("[MapEngine] task error:", e);
      }
    }

    // tamamlanmış görevleri temizle
    this.tasks = this.tasks.filter(
      (t) => !(typeof t.is_done === "function" && t.is_done && t.is_done())
    );
  }
}
