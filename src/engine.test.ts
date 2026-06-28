import { describe, expect, it } from "vitest";
import { assessTask, generateRescuePlan, understandTask } from "./engine";
import { demoState } from "./seed";

describe("deadline engine", () => {
  it("returns bounded confidence and positive capacity", () => {
    const state = demoState("student");
    const result = assessTask(state.tasks[0], state.profile, state.busyBlocks);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(4);
    expect(result.confidenceScore).toBeLessThanOrEqual(96);
    expect(result.usableMinutes).toBeGreaterThanOrEqual(0);
  });

  it("never schedules blocks beyond the deadline or on overlaps", () => {
    const state = demoState("student");
    const task = state.tasks[0];
    const plan = generateRescuePlan(task, state.profile, state.busyBlocks);
    for (const block of plan.blocks) {
      expect(new Date(block.end).getTime()).toBeLessThanOrEqual(new Date(task.deadline).getTime());
      for (const busy of state.busyBlocks) {
        const overlap =
          new Date(block.start) < new Date(busy.end) && new Date(block.end) > new Date(busy.start);
        expect(overlap).toBe(false);
      }
    }
  });

  it("preserves completed work in remaining effort", () => {
    const state = demoState("professional");
    const before = assessTask(state.tasks[0], state.profile, state.busyBlocks);
    state.tasks[0].subtasks[0].completed = true;
    const after = assessTask(state.tasks[0], state.profile, state.busyBlocks);
    expect(after.requiredMinutes).toBeLessThan(before.requiredMinutes);
    expect(after.confidenceScore).toBeGreaterThanOrEqual(before.confidenceScore);
  });

  it("keeps a five-minute bill payment as one concrete action", () => {
    const result = understandTask("Pay electricity bill", 5);
    expect(result.oneSitting).toBe(true);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].title.toLowerCase()).toContain("pay");
  });

  it("creates domain-specific steps for a software project", () => {
    const result = understandTask("Build software engineering project", 960);
    expect(result.kind).toBe("project");
    expect(result.steps.some((step) => step.title.toLowerCase().includes("test"))).toBe(true);
  });
});
