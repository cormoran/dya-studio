import { Notification, Response } from "../proto/cormoran/pmw3610/pmw3610";

const RELAY_TIMEOUT_MS = 6000;
const BROADCAST_WINDOW_MS = 2000;

export const PMW3610_SOURCE_ALL = 0xffffffff;

interface PendingRequest {
  source: number;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class Pmw3610RelayCorrelator {
  private pending = new Map<number, PendingRequest>();
  private broadcasts = new Map<
    number,
    Array<{ source: number; response: Response }>
  >();

  waitFor(requestId: number, source: number): Promise<Response> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Peripheral ${source} did not respond.`));
      }, RELAY_TIMEOUT_MS);
      this.pending.set(requestId, { source, resolve, reject, timeout });
    });
  }

  collectBroadcast(
    requestId: number,
  ): Promise<Array<{ source: number; response: Response }>> {
    const responses: Array<{ source: number; response: Response }> = [];
    this.broadcasts.set(requestId, responses);
    return new Promise((resolve) => {
      setTimeout(() => {
        this.broadcasts.delete(requestId);
        resolve(responses);
      }, BROADCAST_WINDOW_MS);
    });
  }

  handle(payload: Uint8Array): boolean {
    let notification: Notification;
    try {
      notification = Notification.decode(payload);
    } catch {
      return false;
    }

    const peripheral = notification.peripheralResponse;
    if (!peripheral?.response) return false;

    const pending = this.pending.get(peripheral.requestId);
    if (pending?.source === peripheral.source) {
      clearTimeout(pending.timeout);
      this.pending.delete(peripheral.requestId);
      pending.resolve(peripheral.response);
      return true;
    }

    const responses = this.broadcasts.get(peripheral.requestId);
    if (responses) {
      responses.push({
        source: peripheral.source,
        response: peripheral.response,
      });
      return true;
    }
    return false;
  }

  clear(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("PMW3610 relay disconnected."));
    }
    this.pending.clear();
    this.broadcasts.clear();
  }
}
