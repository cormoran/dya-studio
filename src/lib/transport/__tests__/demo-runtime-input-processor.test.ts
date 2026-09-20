/**
 * Tests for Demo Runtime Input Processor Handler
 */

import { RuntimeInputProcessorHandler } from "../demo-runtime-input-processor";
import {
  Request,
  Notification,
} from "../../../proto/zmk/runtime_input_processor/runtime_input_processor";

describe("RuntimeInputProcessorHandler", () => {
  let handler: RuntimeInputProcessorHandler;

  beforeEach(() => {
    jest.useFakeTimers();
    handler = new RuntimeInputProcessorHandler();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe("listProcessors request", () => {
    it("should return success response for listProcessors request", () => {
      const request = Request.create({
        listProcessors: {},
      });

      const response = handler.process(request);

      expect(response.listProcessors).toBeDefined();
      expect(response.error).toBeUndefined();
    });

    it("should send processor notifications via callback", () => {
      const notifications: Notification[] = [];

      handler.notify((payload: Uint8Array) => {
        const notification = Notification.decode(payload);
        notifications.push(notification);
      });

      const request = Request.create({
        listProcessors: {},
      });

      handler.process(request);

      jest.runAllTimers();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].processorChanged?.processor).toMatchObject({
        id: 0,
        name: "trackpad",
        scaleMultiplier: 1,
        scaleDivisor: 1,
        rotationDegrees: 0,
      });
    });
  });

  describe("getProcessor request", () => {
    it("should return processor info for valid id", () => {
      const request = Request.create({
        getProcessor: {
          id: 0,
        },
      });

      const response = handler.process(request);

      expect(response.getProcessor).toBeDefined();
      expect(response.getProcessor?.processor).toBeDefined();
      expect(response.getProcessor?.processor?.id).toBe(0);
      expect(response.getProcessor?.processor?.name).toBe("trackpad");
      expect(response.error).toBeUndefined();
    });

    it("should return error for invalid processor id", () => {
      const request = Request.create({
        getProcessor: {
          id: 999,
        },
      });

      const response = handler.process(request);

      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain("not found");
    });
  });

  describe("setScaleMultiplier request", () => {
    it("should return success response for valid setScaleMultiplier request", () => {
      const request = Request.create({
        setScaleMultiplier: {
          id: 0,
          value: 2,
        },
      });

      const response = handler.process(request);

      expect(response.setScaleMultiplier).toBeDefined();
      expect(response.error).toBeUndefined();
    });

    it("should update processor multiplier and send notification", () => {
      const notifications: Notification[] = [];

      handler.notify((payload: Uint8Array) => {
        const notification = Notification.decode(payload);
        notifications.push(notification);
      });

      const request = Request.create({
        setScaleMultiplier: {
          id: 0,
          value: 2,
        },
      });

      handler.process(request);

      jest.runAllTimers();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].processorChanged?.processor).toMatchObject({
        id: 0,
        scaleMultiplier: 2,
      });
      expect(
        handler.process(Request.create({ getProcessor: { id: 0 } }))
          .getProcessor?.processor,
      ).toMatchObject({ id: 0, scaleMultiplier: 2 });
    });

    it("should return error for invalid processor id", () => {
      const request = Request.create({
        setScaleMultiplier: {
          id: 999,
          value: 2,
        },
      });

      const response = handler.process(request);

      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain("not found");
    });
  });

  describe("setRotation request", () => {
    it("should return success response for valid setRotation request", () => {
      const request = Request.create({
        setRotation: {
          id: 0,
          value: 90,
        },
      });

      const response = handler.process(request);

      expect(response.setRotation).toBeDefined();
      expect(response.error).toBeUndefined();
    });

    it("should update processor rotation and send notification", () => {
      const notifications: Notification[] = [];

      handler.notify((payload: Uint8Array) => {
        const notification = Notification.decode(payload);
        notifications.push(notification);
      });

      const request = Request.create({
        setRotation: {
          id: 0,
          value: 90,
        },
      });

      handler.process(request);

      jest.runAllTimers();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].processorChanged?.processor).toMatchObject({
        id: 0,
        rotationDegrees: 90,
      });
      expect(
        handler.process(Request.create({ getProcessor: { id: 0 } }))
          .getProcessor?.processor,
      ).toMatchObject({ id: 0, rotationDegrees: 90 });
    });

    it("should return error for invalid processor id", () => {
      const request = Request.create({
        setRotation: {
          id: 999,
          value: 90,
        },
      });

      const response = handler.process(request);

      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain("not found");
    });
  });

  describe("invalid request", () => {
    it("should return error for empty request", () => {
      const request = Request.create({});

      const response = handler.process(request);

      expect(response.error).toBeDefined();
      expect(response.error?.message).toBe("Not implemented");
    });
  });
});
