# Demo Mode Architecture

## Overview

Demo Mode allows users to try DYA Studio's features without connecting to a physical keyboard. It provides a realistic simulation of the keymap editor using mock data and operations.

## Architecture

### Core Components

1. **DemoModeContext** (`src/contexts/DemoModeContext.tsx`)
   - Global state management for demo mode
   - Simple boolean flag (`isDemoMode`)
   - Methods: `enableDemoMode()`, `disableDemoMode()`, `toggleDemoMode()`

2. **Mock Data** (`src/lib/mockKeymapData.ts`)
   - `mockPhysicalLayouts`: Simulated keyboard layout with 42 keys
   - `mockKeymap`: Three layers (Base QWERTY, Numbers, Function)
   - `mockBehaviors`: Basic behavior definitions (kp, trans, mo, to)

3. **useDemoKeymap Hook** (`src/hooks/useDemoKeymap.ts`)
   - Implements the same interface as `useKeymap`
   - All operations work in-memory
   - Changes are simulated without device communication
   - Matches the API of the real keymap hook for seamless integration

### Integration Points

1. **App.tsx**
   - Wraps the app with `DemoModeProvider`
   - Shows main UI when either connected OR in demo mode
   - Displays "Demo Mode" as device name when active

2. **SplashScreen.tsx**
   - Added "Try Demo Mode" button
   - Uses `IconPresentationAnalytics` icon
   - Styled with cyber purple accent color

3. **KeymapPage.tsx**
   - Switches between `useKeymap` and `useDemoKeymap` based on demo mode state
   - All existing functionality works seamlessly
   - Info section updates to indicate demo mode

## Data Flow

```
User clicks "Try Demo Mode"
         ↓
DemoModeContext.enableDemoMode()
         ↓
App shows main UI (connection = false, demoMode = true)
         ↓
KeymapPage renders with useDemoKeymap
         ↓
User interacts with mock data
         ↓
Changes saved in-memory (not persisted)
```

## Implementation Details

### Mock Keymap Structure

- **42 keys**: 6x3 grid per half + 3 thumb keys per side
- **3 layers**:
  - Layer 0 (Base): Standard QWERTY layout
  - Layer 1 (Numbers): Number row + arrow keys
  - Layer 2 (Function): F1-F12 keys
- **Key positioning**: Uses realistic physical coordinates
- **Bindings**: HID keycodes matching standard keyboard

### Simulated Operations

All keymap operations are simulated:

- `setBinding()`: Updates in-memory state immediately
- `resetBinding()`: Restores from original bindings map
- `moveLayer()`: Array manipulation
- `addLayer()`: Creates new layer with transparent bindings
- `removeLayer()`: Tracks removed layer IDs
- `restoreLayer()`: Re-adds removed layers
- `saveChanges()`: 500ms delay, clears unsaved flag
- `discardChanges()`: Resets to initial mock data

### State Management

- Demo mode state is global (DemoModeContext)
- Keymap state is local to useDemoKeymap
- Changes persist only while demo mode is active
- Exiting demo mode resets all state

## Testing

- `DemoModeContext.test.tsx`: Tests context state management
- `useDemoKeymap.test.tsx`: Tests all keymap operations
- All 18 new tests passing
- Maintains 100% backward compatibility with existing tests

## Future Extensions

Demo mode can be extended to other pages by:

1. Creating mock data for that feature (e.g., `mockBatteryData.ts`)
2. Creating a demo hook (e.g., `useDemoBattery.ts`)
3. Updating the page to use demo hook when `isDemoMode` is true
4. Following the same pattern as KeymapPage

## Benefits

- **User Onboarding**: Users can learn the interface before buying
- **Development**: Easier to test UI without hardware
- **Documentation**: Can demonstrate features in screenshots/videos
- **Safety**: Users can explore without risk of misconfiguration
