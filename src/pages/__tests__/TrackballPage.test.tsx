/**
 * Tests for TrackballPage component
 */
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrackballPage } from "../TrackballPage";
import { useRuntimeInputProcessor } from "../../hooks/useRuntimeInputProcessor";

// Mock the useRuntimeInputProcessor hook
jest.mock("../../hooks/useRuntimeInputProcessor");

const mockUseRuntimeInputProcessor =
  useRuntimeInputProcessor as jest.MockedFunction<
    typeof useRuntimeInputProcessor
  >;

// Helper to create default mock processor
const createMockProcessor = (overrides = {}) => ({
  id: 0,
  name: "trackpad",
  scaleMultiplier: 1,
  scaleDivisor: 1,
  rotationDegrees: 0,
  tempLayerEnabled: false,
  tempLayerLayer: 0,
  tempLayerActivationDelayMs: 100,
  tempLayerDeactivationDelayMs: 500,
  activeLayers: 0,
  axisSnapMode: 0,
  axisSnapThreshold: 50,
  axisSnapTimeoutMs: 200,
  xInvert: false,
  yInvert: false,
  xyToScrollEnabled: false,
  xySwapEnabled: false,
  ...overrides,
});

// Helper to create default runtime input processor hook return value
const createMockHookReturn = (overrides = {}) => ({
  processors: [],
  layers: [],
  isLoading: false,
  error: null,
  loadProcessors: jest.fn(),
  loadLayers: jest.fn(),
  setScaling: jest.fn(),
  setRotation: jest.fn(),
  setTempLayerEnabled: jest.fn(),
  setTempLayerLayer: jest.fn(),
  setTempLayerActivationDelay: jest.fn(),
  setTempLayerDeactivationDelay: jest.fn(),
  setActiveLayers: jest.fn(),
  setAxisSnapMode: jest.fn(),
  setAxisSnapThreshold: jest.fn(),
  setAxisSnapTimeout: jest.fn(),
  setXInvert: jest.fn(),
  setYInvert: jest.fn(),
  setXyToScrollEnabled: jest.fn(),
  setXySwapEnabled: jest.fn(),
  ...overrides,
});

describe("TrackballPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render trackball settings header", () => {
    mockUseRuntimeInputProcessor.mockReturnValue(createMockHookReturn());

    render(<TrackballPage />);

    expect(screen.getByText("Trackball Settings")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Adjust sensitivity and behavior via runtime input processor",
      ),
    ).toBeInTheDocument();
  });

  it("should show loading state when initially loading", () => {
    mockUseRuntimeInputProcessor.mockReturnValue(
      createMockHookReturn({ isLoading: true }),
    );

    render(<TrackballPage />);

    expect(
      screen.getByText("Loading trackball settings..."),
    ).toBeInTheDocument();
  });

  it("should display error message", () => {
    const errorMessage = "Failed to connect to device";
    mockUseRuntimeInputProcessor.mockReturnValue(
      createMockHookReturn({ error: errorMessage }),
    );

    render(<TrackballPage />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("should show no processor message when no processors found", () => {
    mockUseRuntimeInputProcessor.mockReturnValue(createMockHookReturn());

    render(<TrackballPage />);

    expect(
      screen.getByText(/No runtime input processor found/),
    ).toBeInTheDocument();
  });

  it("should display processor information when loaded", () => {
    mockUseRuntimeInputProcessor.mockReturnValue(
      createMockHookReturn({
        processors: [createMockProcessor()],
      }),
    );

    render(<TrackballPage />);

    // Check for "Active on Layers" section instead
    expect(screen.getByText("Active on Layers")).toBeInTheDocument();
    expect(screen.getByText("Scaling")).toBeInTheDocument();
  });

  it("switches processors from the mobile selector", async () => {
    const user = userEvent.setup();
    mockUseRuntimeInputProcessor.mockReturnValue(
      createMockHookReturn({
        processors: [
          createMockProcessor({ id: 0, name: "trackpad" }),
          createMockProcessor({ id: 1, name: "trackball" }),
        ],
      }),
    );

    render(<TrackballPage />);

    const trigger = screen.getByRole("button", {
      name: "Select processor or PMW3610 driver",
    });
    expect(trigger).toHaveTextContent("trackpad");

    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "trackball" }));

    expect(trigger).toHaveTextContent("Processor");
    expect(trigger).toHaveTextContent("trackball");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should display current speed settings", () => {
    mockUseRuntimeInputProcessor.mockReturnValue(
      createMockHookReturn({
        processors: [
          createMockProcessor({
            scaleMultiplier: 2,
            scaleDivisor: 1,
          }),
        ],
      }),
    );

    render(<TrackballPage />);

    expect(screen.getByText("Scaling")).toBeInTheDocument();
    // Check for the displayed scaling value
    expect(screen.getByText("2.00x")).toBeInTheDocument();
  });

  it("should display rotation settings", () => {
    mockUseRuntimeInputProcessor.mockReturnValue(
      createMockHookReturn({
        processors: [
          createMockProcessor({
            rotationDegrees: 90,
          }),
        ],
      }),
    );

    render(<TrackballPage />);

    expect(screen.getByText("Sensor Rotation")).toBeInTheDocument();
    // Check for rotation toggle - rotation should be enabled when degrees != 0
    const switches = screen.getAllByRole("switch");
    // The rotation switch should be checked (rotation is 90 degrees)
    expect(switches[0]).toBeInTheDocument();
  });

  it("should call setScaling when scaling step button is clicked", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    const mockSetScaling = jest.fn();

    mockUseRuntimeInputProcessor.mockReturnValue(
      createMockHookReturn({
        processors: [createMockProcessor()],
        setScaling: mockSetScaling,
      }),
    );

    render(<TrackballPage />);

    await user.click(screen.getByLabelText("Increase scaling"));

    // Fast-forward time to trigger debounced auto-save (1500ms)
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    expect(mockSetScaling).toHaveBeenCalledWith(0, 21, 20);

    jest.useRealTimers();
  });

  it("should increase scaling from decimal step values", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    const mockSetScaling = jest.fn();

    mockUseRuntimeInputProcessor.mockReturnValue(
      createMockHookReturn({
        processors: [
          createMockProcessor({
            scaleMultiplier: 23,
            scaleDivisor: 20,
          }),
        ],
        setScaling: mockSetScaling,
      }),
    );

    render(<TrackballPage />);

    await user.click(screen.getByLabelText("Increase scaling"));

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    expect(mockSetScaling).toHaveBeenCalledWith(0, 6, 5);

    jest.useRealTimers();
  });

  it("should call setRotation when rotation is toggled off", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    const mockSetRotation = jest.fn();

    // Start with rotation enabled at 90 degrees
    mockUseRuntimeInputProcessor.mockReturnValue(
      createMockHookReturn({
        processors: [
          createMockProcessor({
            rotationDegrees: 90,
          }),
        ],
        setRotation: mockSetRotation,
      }),
    );

    render(<TrackballPage />);

    // Find all switches (active layers toggle, rotation toggle, temp layer toggle)
    const switches = screen.getAllByRole("switch");
    // Second switch is rotation toggle (first is active layers mode), should be enabled since rotation is 90
    const rotationToggle = switches[1];
    // Toggle it off
    await user.click(rotationToggle);

    // Fast-forward time to trigger debounced auto-save (1500ms)
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    // Disabling rotation should set it to 0
    expect(mockSetRotation).toHaveBeenCalledWith(0, 0);

    jest.useRealTimers();
  });

  it("should call setRotation when rotation step button is clicked", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    const mockSetRotation = jest.fn();

    mockUseRuntimeInputProcessor.mockReturnValue(
      createMockHookReturn({
        processors: [
          createMockProcessor({
            rotationDegrees: 90,
          }),
        ],
        setRotation: mockSetRotation,
      }),
    );

    render(<TrackballPage />);

    await user.click(screen.getByLabelText("Increase rotation"));

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    expect(mockSetRotation).toHaveBeenCalledWith(0, 91);

    jest.useRealTimers();
  });

  it("should display current configuration details", () => {
    mockUseRuntimeInputProcessor.mockReturnValue(
      createMockHookReturn({
        processors: [
          createMockProcessor({
            scaleMultiplier: 3,
            scaleDivisor: 2,
            rotationDegrees: 180,
          }),
        ],
      }),
    );

    render(<TrackballPage />);

    // Test that the scaling section shows the calculated value
    expect(screen.getByText("Scaling")).toBeInTheDocument();
    // The final scaling value should be displayed (3/2 = 1.50x)
    expect(screen.getByText("1.50x")).toBeInTheDocument();
  });
});
