import {
  Config,
  Response,
  type Request,
} from "../../proto/cormoran/runtime_tapdance/runtime_tapdance";
import { emptyTapDance, TAP_DANCE_ACTIONS } from "../runtimeTapDance";

/** Protocol simulator only: does not simulate tap timing or physical key events. */
export class RuntimeTapDanceHandler {
  private slots = Array.from({ length: 8 }, emptyTapDance);
  private intervalMs = 200;
  constructor() {
    this.slots[0] = Config.create({
      singleBinding: { behaviorId: 10, param1: 0x70004 },
      doubleBinding: { behaviorId: 10, param1: 0x70005 },
      tripleBinding: { behaviorId: 10, param1: 0x70006 },
    });
  }
  process(request: Request): Response {
    const index =
      request.get?.index ?? request.set?.index ?? request.remove?.index ?? 0;
    if (index >= this.slots.length)
      return Response.create({
        error: { code: -22, message: "Invalid tapdance slot" },
      });
    if (request.set) {
      const field = TAP_DANCE_ACTIONS[request.set.tapCount - 1];
      if (!field || request.set.binding?.behaviorId === 32)
        return Response.create({
          error: { code: -22, message: "Invalid tapdance action" },
        });
      const next = Config.create({
        ...this.slots[index],
        [field]: request.set.binding,
      });
      if (
        (!next.singleBinding?.behaviorId &&
          (next.doubleBinding?.behaviorId || next.tripleBinding?.behaviorId)) ||
        (next.tripleBinding?.behaviorId && !next.doubleBinding?.behaviorId)
      )
        return Response.create({
          error: { code: -22, message: "Tapdance actions must be contiguous" },
        });
      this.slots[index] = next;
    } else if (request.remove) this.slots[index] = emptyTapDance();
    else if (request.setInterval) {
      if (
        request.setInterval.intervalMs < 1 ||
        request.setInterval.intervalMs > 2000
      )
        return Response.create({
          error: { code: -22, message: "Invalid tapdance interval" },
        });
      this.intervalMs = request.setInterval.intervalMs;
    }
    return Response.create({
      state: {
        index,
        config: this.slots[index],
        intervalMs: this.intervalMs,
        maxCount: this.slots.length,
      },
    });
  }
}
