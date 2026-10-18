import {
  Config,
  GlobalResponse,
  Response,
  State,
  type Request,
} from "../../proto/cormoran/runtime_tapdance/runtime_tapdance";
import { emptyTapDance, TAP_DANCE_ACTIONS } from "../runtimeTapDance";

type Entry = { name: string; config: Config };
/** API v2 simulator. Pool byte accounting is illustrative, not firmware geometry. */
export class RuntimeTapDanceHandler {
  private entries = new Map<number, Entry>([
    [
      7,
      {
        name: "Alphabet",
        config: Config.create({
          singleBinding: { behaviorId: 10, param1: 0x70004 },
          doubleBinding: { behaviorId: 10, param1: 0x70005 },
          tripleBinding: { behaviorId: 10, param1: 0x70006 },
        }),
      },
    ],
  ]);
  private flash = this.copy(this.entries);
  private nextId = 8;
  private intervalMs = 200;
  private flashIntervalMs = 200;
  private copy(entries: Map<number, Entry>) {
    return new Map(
      [...entries].map(([id, entry]) => [
        id,
        { name: entry.name, config: Config.create(entry.config) },
      ]),
    );
  }
  private dirty(id: number) {
    return (
      JSON.stringify(this.entries.get(id)) !==
      JSON.stringify(this.flash.get(id))
    );
  }
  private poolBytes(entries = this.entries) {
    return [...entries.values()].reduce(
      (sum, entry) => sum + 53 + new TextEncoder().encode(entry.name).length,
      0,
    );
  }
  private global() {
    return GlobalResponse.create({
      apiVersion: 2,
      intervalMs: this.intervalMs,
      maxEntries: 16,
      usedEntries: this.entries.size,
      maxNameLength: 24,
      poolBytesTotal: 512,
      poolBytesUsed: this.poolBytes(),
      hasUnsavedChanges:
        this.intervalMs !== this.flashIntervalMs ||
        [...new Set([...this.entries.keys(), ...this.flash.keys()])].some(
          (id) => this.dirty(id),
        ),
    });
  }
  private state(index: number) {
    const entry = this.entries.get(index)!;
    return State.create({
      index,
      name: entry.name,
      config: entry.config,
      intervalMs: this.intervalMs,
      maxCount: 16,
      hasUnsavedChanges: this.dirty(index),
    });
  }
  process(request: Request): Response {
    const fail = (message: string, code = -22) =>
      Response.create({ error: { message, code } });
    const status = (affectedCount: number) =>
      Response.create({ status: { affectedCount } });
    if (request.getGlobal) return Response.create({ global: this.global() });
    if (request.list) {
      const available = [...this.entries.keys()]
        .sort((a, b) => a - b)
        .filter(
          (id) => !request.list!.hasAfterId || id > request.list!.afterId,
        );
      const page = available.slice(0, 4);
      return Response.create({
        list: {
          entries: page.map((index) => ({
            index,
            name: this.entries.get(index)!.name,
            hasUnsavedChanges: this.dirty(index),
          })),
          hasMore: available.length > page.length,
          nextAfterId: page.at(-1) ?? 0,
        },
      });
    }
    if (request.save) {
      const count =
        [...this.entries.keys()].filter((id) => this.dirty(id)).length +
        (this.intervalMs !== this.flashIntervalMs ? 1 : 0);
      this.flash = this.copy(this.entries);
      this.flashIntervalMs = this.intervalMs;
      return status(count);
    }
    if (request.discard) {
      const count = this.entries.size;
      this.entries = this.copy(this.flash);
      this.intervalMs = this.flashIntervalMs;
      return status(count);
    }
    if (request.setInterval) {
      if (
        request.setInterval.intervalMs < 1 ||
        request.setInterval.intervalMs > 2000
      )
        return fail("Invalid tapdance interval");
      this.intervalMs = request.setInterval.intervalMs;
      if (request.setInterval.persist) this.flashIntervalMs = this.intervalMs;
      return Response.create({ global: this.global() });
    }
    if (request.create || request.rename) {
      const input = request.create ?? request.rename!;
      const name = input.name.trim();
      const index = request.create ? this.nextId : request.rename!.index;
      if (!request.create && !this.entries.has(index))
        return fail("Tapdance not found", -2);
      if (!name || new TextEncoder().encode(name).length > 24)
        return fail("Invalid tapdance name");
      if (
        [...this.entries].some(
          ([id, entry]) => id !== index && entry.name === name,
        )
      )
        return fail("Tapdance name already exists", -17);
      if (request.create && this.entries.size >= 16)
        return fail("Tapdance capacity exhausted", -12);
      const next = this.copy(this.entries);
      next.set(index, {
        name,
        config: next.get(index)?.config ?? emptyTapDance(),
      });
      if (this.poolBytes(next) > 512)
        return fail("Shared pool capacity exhausted", -12);
      this.entries = next;
      if (request.create) this.nextId++;
      if (input.persist)
        this.flash.set(index, {
          name,
          config: Config.create(next.get(index)!.config),
        });
      return Response.create({ state: this.state(index) });
    }
    const index =
      request.get?.index ??
      request.set?.index ??
      request.delete?.index ??
      request.remove?.index;
    if (index === undefined) return fail("Unsupported request", -95);
    const entry = this.entries.get(index);
    if (!entry) return fail("Tapdance not found", -2);
    if (request.delete || request.remove) {
      this.entries.delete(index);
      this.flash.delete(index);
      return status(1);
    }
    if (request.set) {
      const field = TAP_DANCE_ACTIONS[request.set.tapCount - 1];
      if (
        !field ||
        !request.set.binding ||
        request.set.binding.behaviorId === 32
      )
        return fail("Invalid tapdance action");
      const next = Config.create({
        ...entry.config,
        [field]: request.set.binding,
      });
      if (
        (!next.singleBinding?.behaviorId &&
          (next.doubleBinding?.behaviorId || next.tripleBinding?.behaviorId)) ||
        (next.tripleBinding?.behaviorId && !next.doubleBinding?.behaviorId)
      )
        return fail("Tapdance actions must be contiguous");
      entry.config = next;
      if (request.set.persist)
        this.flash.set(index, {
          name: entry.name,
          config: Config.create(next),
        });
    }
    return Response.create({ state: this.state(index) });
  }
}
