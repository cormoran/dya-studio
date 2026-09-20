import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SensorRotationConfig } from "../SensorRotationConfig";
import {
  useRuntimeSensorRotate,
  type UseRuntimeSensorRotateReturn,
} from "../../hooks/useRuntimeSensorRotate";
import type { BehaviorDefinition } from "../../hooks/useKeymap";

// Mock the hooks
jest.mock("../../hooks/useRuntimeSensorRotate");

const mockUseRuntimeSensorRotate =
  useRuntimeSensorRotate as jest.MockedFunction<typeof useRuntimeSensorRotate>;

// Helper to create mock return value
const createMockReturn = (
  overrides: Partial<UseRuntimeSensorRotateReturn>,
): UseRuntimeSensorRotateReturn => ({
  isAvailable: false,
  isLoading: false,
  sensors: [],
  error: null,
  loadSensors: jest.fn(),
  getAllLayerBindings: jest.fn(),
  setLayerCwBindings: jest.fn(),
  setLayerCcwBindings: jest.fn(),
  ...overrides,
});

describe("SensorRotationConfig", () => {
  const mockBehaviors = new Map<number, BehaviorDefinition>([
    [
      1,
      {
        id: 1,
        displayName: "Key Press",
        param1Display: "keycode",
        param2Display: null,
      },
    ],
  ]);

  const mockLayers = [
    { id: 0, name: "Default" },
    { id: 1, name: "Lower" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  async function setupSensors(sensorCount = 1) {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    // Different directional bindings catch accidental copying of CW into CCW.
    const cwBinding = { behaviorId: 1, param1: 4, param2: 0, tapMs: 5 };
    const ccwBinding = { behaviorId: 1, param1: 5, param2: 0, tapMs: 5 };
    const setLayerCwBindings = jest.fn().mockResolvedValue(true);
    const setLayerCcwBindings = jest.fn().mockResolvedValue(true);
    const getAllLayerBindings = jest
      .fn()
      .mockResolvedValue([{ layer: 0, cwBinding, ccwBinding }]);
    mockUseRuntimeSensorRotate.mockReturnValue(
      createMockReturn({
        isAvailable: true,
        sensors: Array.from({ length: sensorCount }, (_, index) => ({
          index,
          name: `Encoder ${index + 1}`,
        })),
        getAllLayerBindings,
        setLayerCwBindings,
        setLayerCcwBindings,
      }),
    );
    render(
      <SensorRotationConfig
        selectedLayerId={0}
        behaviors={mockBehaviors}
        layers={mockLayers}
      />,
    );
    // Wait for rendered data, not merely for the read RPC to start.
    const inputs = await screen.findAllByDisplayValue("5");
    expect(inputs).toHaveLength(sensorCount);
    return {
      user,
      inputs,
      cwBinding,
      ccwBinding,
      setLayerCwBindings,
      setLayerCcwBindings,
    };
  }

  async function advanceTime(ms: number) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(ms);
    });
  }

  describe("Tap Time Debouncing", () => {
    test("keeps changes pending until 1500ms, then updates both directional bindings once", async () => {
      const {
        user,
        inputs,
        cwBinding,
        ccwBinding,
        setLayerCwBindings,
        setLayerCcwBindings,
      } = await setupSensors();
      await user.clear(inputs[0]);
      await user.type(inputs[0], "10");
      expect(inputs[0]).toHaveValue(10);
      expect(screen.getByText(/pending/i)).toBeInTheDocument();

      await advanceTime(1499);
      expect(setLayerCwBindings).not.toHaveBeenCalled();
      expect(setLayerCcwBindings).not.toHaveBeenCalled();
      expect(screen.getByText(/pending/i)).toBeInTheDocument();

      await advanceTime(1);
      expect(setLayerCwBindings).toHaveBeenCalledTimes(1);
      expect(setLayerCwBindings).toHaveBeenCalledWith(0, 0, {
        ...cwBinding,
        tapMs: 10,
      });
      expect(setLayerCcwBindings).toHaveBeenCalledTimes(1);
      expect(setLayerCcwBindings).toHaveBeenCalledWith(0, 0, {
        ...ccwBinding,
        tapMs: 10,
      });
      expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
      expect(inputs[0]).toHaveValue(10);
    });

    test("cancels the previous debounce on a new change", async () => {
      const {
        user,
        inputs,
        cwBinding,
        ccwBinding,
        setLayerCwBindings,
        setLayerCcwBindings,
      } = await setupSensors();
      await user.clear(inputs[0]);
      await user.type(inputs[0], "10");
      await advanceTime(750);
      await user.clear(inputs[0]);
      await user.type(inputs[0], "20");

      // The original deadline has passed, but the replacement is still pending.
      await advanceTime(1499);
      expect(setLayerCwBindings).not.toHaveBeenCalled();
      expect(setLayerCcwBindings).not.toHaveBeenCalled();
      await advanceTime(1);
      expect(setLayerCwBindings).toHaveBeenCalledTimes(1);
      expect(setLayerCwBindings).toHaveBeenCalledWith(0, 0, {
        ...cwBinding,
        tapMs: 20,
      });
      expect(setLayerCcwBindings).toHaveBeenCalledTimes(1);
      expect(setLayerCcwBindings).toHaveBeenCalledWith(0, 0, {
        ...ccwBinding,
        tapMs: 20,
      });
    });

    test("handles multiple sensor deadlines independently", async () => {
      const {
        user,
        inputs,
        cwBinding,
        ccwBinding,
        setLayerCwBindings,
        setLayerCcwBindings,
      } = await setupSensors(2);
      await user.clear(inputs[0]);
      await user.type(inputs[0], "10");
      await advanceTime(750);
      await user.clear(inputs[1]);
      await user.type(inputs[1], "20");

      await advanceTime(750);
      expect(setLayerCwBindings).toHaveBeenCalledTimes(1);
      expect(setLayerCwBindings).toHaveBeenLastCalledWith(0, 0, {
        ...cwBinding,
        tapMs: 10,
      });
      expect(setLayerCcwBindings).toHaveBeenCalledTimes(1);
      expect(setLayerCcwBindings).toHaveBeenLastCalledWith(0, 0, {
        ...ccwBinding,
        tapMs: 10,
      });
      expect(screen.getAllByText(/pending/i)).toHaveLength(1);

      await advanceTime(750);
      expect(setLayerCwBindings).toHaveBeenCalledTimes(2);
      expect(setLayerCwBindings).toHaveBeenLastCalledWith(1, 0, {
        ...cwBinding,
        tapMs: 20,
      });
      expect(setLayerCcwBindings).toHaveBeenCalledTimes(2);
      expect(setLayerCcwBindings).toHaveBeenLastCalledWith(1, 0, {
        ...ccwBinding,
        tapMs: 20,
      });
      expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    test("shows 'No rotary encoders detected' when no sensors", () => {
      mockUseRuntimeSensorRotate.mockReturnValue(
        createMockReturn({
          isAvailable: true,
        }),
      );

      render(
        <SensorRotationConfig
          selectedLayerId={0}
          behaviors={mockBehaviors}
          layers={mockLayers}
        />,
      );

      expect(
        screen.getByText("No rotary encoders detected"),
      ).toBeInTheDocument();
    });

    test("shows loading state", () => {
      mockUseRuntimeSensorRotate.mockReturnValue(
        createMockReturn({
          isAvailable: true,
          isLoading: true,
        }),
      );

      render(
        <SensorRotationConfig
          selectedLayerId={0}
          behaviors={mockBehaviors}
          layers={mockLayers}
        />,
      );

      expect(screen.getByText("Loading sensors...")).toBeInTheDocument();
    });
  });
});
