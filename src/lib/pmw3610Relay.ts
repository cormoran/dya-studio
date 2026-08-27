import { Notification, type Response } from "../proto/cormoran/pmw3610/pmw3610";

const DEFAULT_TIMEOUT_MS = 6_000;
const DEFAULT_BROADCAST_WINDOW_MS = 2_000;

export const PMW3610_SOURCE_ALL = 0xffffffff;

interface RelayedResponse {
  source: number;
  response: Response;
}

interface PendingRequest {
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

/** Correlates PMW3610 DeferredResponse replies with custom notifications. */
export class Pmw3610RelayCorrelator {
  private pending = new Map<number, PendingRequest>();
  private broadcasts = new Map<
    number,
    {
      responses: RelayedResponse[];
      resolve: (value: RelayedResponse[]) => void;
    }
  >();
  private buffered = new Map<number, RelayedResponse[]>();
  private readonly timeoutMs: number;

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  waitFor(requestId: number): Promise<Response> {
    const buffered = this.buffered.get(requestId)?.shift();
    if (buffered) {
      if (this.buffered.get(requestId)?.length === 0) {
        this.buffered.delete(requestId);
      }
      return Promise.resolve(buffered.response);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(requestId);
        reject(
          new Error(
            `Timed out waiting for PMW3610 peripheral response ${requestId}`,
          ),
        );
      }, this.timeoutMs);
      this.pending.set(requestId, { resolve, reject, timeoutId });
    });
  }

  collectBroadcast(
    requestId: number,
    windowMs: number = DEFAULT_BROADCAST_WINDOW_MS,
  ): Promise<RelayedResponse[]> {
    return new Promise((resolve) => {
      const responses = this.buffered.get(requestId) ?? [];
      this.buffered.delete(requestId);
      this.broadcasts.set(requestId, { responses, resolve });
      setTimeout(() => {
        const broadcast = this.broadcasts.get(requestId);
        this.broadcasts.delete(requestId);
        resolve(broadcast?.responses ?? responses);
      }, windowMs);
    });
  }

  handleNotificationPayload(payload: Uint8Array): boolean {
    let notification: Notification;
    try {
      notification = Notification.decode(payload);
    } catch {
      return false;
    }

    const peripheral = notification.peripheralResponse;
    if (!peripheral?.response) return false;

    const pending = this.pending.get(peripheral.requestId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pending.delete(peripheral.requestId);
      pending.resolve(peripheral.response);
      return true;
    }

    const response = {
      source: peripheral.source,
      response: peripheral.response,
    };
    const broadcast = this.broadcasts.get(peripheral.requestId);
    if (broadcast) {
      broadcast.responses.push(response);
    } else {
      const buffered = this.buffered.get(peripheral.requestId) ?? [];
      buffered.push(response);
      this.buffered.set(peripheral.requestId, buffered);
    }
    return true;
  }

  clear(reason: string): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error(reason));
    }
    this.pending.clear();
    for (const broadcast of this.broadcasts.values()) {
      broadcast.resolve(broadcast.responses);
    }
    this.broadcasts.clear();
    this.buffered.clear();
  }
}
