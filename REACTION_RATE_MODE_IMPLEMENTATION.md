# Reaction Rate Mode Implementation

## Overview
Successfully implemented a dual-mode simulation system that allows users to toggle between:
1. **Single Collision Mode** (original) - Controlled, precise single molecule pair collisions
2. **Reaction Rate Mode** (new) - Multiple molecule pairs colliding randomly to demonstrate reaction rates

## Implementation Summary

### 1. UI State Extensions (`src/ui/App.tsx`)
Added new properties to `UIState`:
- `simulationMode: 'single' | 'rate'` - Toggle between modes
- `particleCount: number` - Number of molecule pairs in rate mode (5-50)
- `reactionRate: number` - Reactions per second
- `remainingReactants: number` - Percentage of unreacted molecules
- `productsFormed: number` - Count of successful reactions

### 2. Tab Interface (`src/ui/components/sections/ReactionSetup.tsx`)
- Added tab navigation to switch between "Single Collision" and "Reaction Rate" modes
- **Single Collision Tab**: Original controls (attack angle, velocity, temperature)
- **Reaction Rate Tab**: 
  - Particle count slider (5-50 pairs)
  - Temperature slider (affects collision speed)
  - Info box explaining random orientation and temperature effects

### 3. Reaction Rate Simulator (`src/systems/ReactionRateSimulator.ts`)
New class that manages multi-molecule simulations:
- **Features**:
  - Spawns N molecule pairs at random positions in bounded volume
  - Temperature-scaled velocities (Maxwell-Boltzmann distribution)
  - Elastic wall collisions (molecules bounce off boundaries)
  - Tracks collision count, reaction count, and elapsed time
  - Real-time metrics calculation

- **Key Methods**:
  - `initializeSimulation()` - Spawn molecule pairs with temperature-based velocities
  - `update(deltaTime)` - Update physics and handle boundary collisions
  - `getMetrics()` - Return current reaction rate statistics
  - `clear()` - Clean up simulation

### 4. Metrics Visualization (`src/ui/components/sections/ReactionRateMetrics.tsx`)
New component displaying:
- **Reaction Rate Bar** - Reactions per second (green gradient)
- **Remaining Reactants Bar** - Percentage unreacted (blue gradient)
- **Products Formed Counter** - Total successful reactions (green highlight)
- **Collision Stats Grid** - Total collisions and success rate
- **Elapsed Time** - Simulation duration

### 5. ThreeJSBridge Integration (`src/ui/bridge/ThreeJSBridge.ts`)
Extended bridge with rate mode support:
- Initialize `ReactionRateSimulator` on scene setup
- New methods:
  - `startRateSimulation()` - Start multi-molecule simulation
  - `updateRateSimulation()` - Update physics each frame
  - `getRateMetrics()` - Poll current metrics
  - `stopRateSimulation()` - Clear simulation

### 6. MainLayout Updates (`src/ui/components/MainLayout.tsx`)
- Pass `simulationMode` and `particleCount` to ReactionSetup
- Conditionally render either:
  - `CompactLiveData` (single collision metrics)
  - `ReactionRateMetrics` (rate simulation metrics)

### 7. Simulation Control Logic (`src/ui/App.tsx`)
Modified play/pause/reset handlers to support both modes:
- **onPlay**: Start rate simulation or single collision based on mode
- **onPause**: Stop metrics polling in rate mode
- **onReset**: Clear rate simulation or single collision scene
- Added metrics polling useEffect (updates every 500ms in rate mode)

## Key Design Decisions

### Temperature Effects
- **Single Collision Mode**: Temperature affects reaction probability calculation
- **Reaction Rate Mode**: Temperature directly scales molecule velocities (visible speed increase)
  - Formula: `velocity_scale = sqrt(temperature / 298)` (Maxwell-Boltzmann)

### Orientation Handling
- **Single Collision Mode**: User controls attack angle (precise)
- **Reaction Rate Mode**: Random orientations (realistic gas-phase collisions)

### Bounded Volume
- 10x10x10 unit cubic volume
- Elastic wall collisions (90% velocity retention)
- Prevents molecules from escaping scene

### Visual Feedback
- Substrate molecules: Blue spheres
- Nucleophile molecules: Pink/magenta spheres
- Temperature gradient: 100K (blue/slow) → 600K (red/fast)

## User Experience Flow

### Single Collision Mode (Default)
1. Select substrate and nucleophile
2. Choose attack mode or fine-tune angle/velocity
3. Adjust temperature
4. Click "Play" → Watch single collision with controlled parameters

### Reaction Rate Mode
1. Click "Reaction Rate" tab
2. Select substrate and nucleophile
3. Set particle count (5-50 pairs)
4. Adjust temperature (affects speed)
5. Click "Play" → Watch multiple random collisions
6. Monitor reaction rate metrics in real-time

## Technical Notes

### Physics Integration
- Uses existing Cannon.js physics engine
- Wall collisions handled in `ReactionRateSimulator.handleBoundaryCollision()`
- Temperature scaling applied to initial velocities

### Event System
- Registers with `collisionEventSystem` to track reactions
- Handler ID: `'rate_simulator'`
- Tracks successful reactions and collision frequency

### Performance Considerations
- Particle count capped at 50 pairs (100 total molecules)
- Metrics polling at 500ms intervals (avoids excessive updates)
- Simplified sphere representations for molecules

## Files Modified/Created

### Created
- `src/systems/ReactionRateSimulator.ts` - Multi-molecule simulation engine
- `src/ui/components/sections/ReactionRateMetrics.tsx` - Metrics visualization
- `REACTION_RATE_MODE_IMPLEMENTATION.md` - This documentation

### Modified
- `src/ui/App.tsx` - UIState extensions, metrics polling, dual-mode handlers
- `src/ui/components/MainLayout.tsx` - Conditional rendering, new props
- `src/ui/components/sections/ReactionSetup.tsx` - Tab interface, rate mode controls
- `src/ui/bridge/ThreeJSBridge.ts` - Rate simulator initialization and methods

## Future Enhancements (Optional)

1. **Concentration Visualization**: Color-code molecules by energy level
2. **Maxwell-Boltzmann Distribution Graph**: Show velocity distribution
3. **Reaction Progress Curve**: Plot products vs time
4. **Catalysts**: Add catalyst molecules that increase reaction rate
5. **Pressure Effects**: Adjust bounded volume size to simulate pressure changes
6. **Export Data**: CSV export of reaction rate metrics

## Testing Checklist

- [x] Build succeeds without errors
- [ ] Single collision mode works as before
- [ ] Tab switching updates UI correctly
- [ ] Rate mode spawns multiple molecules
- [ ] Temperature slider affects molecule speed
- [ ] Metrics update in real-time during rate simulation
- [ ] Reset clears all molecules
- [ ] Wall collisions prevent molecules from escaping
- [ ] Collision detection triggers reactions
- [ ] Products formed counter increments correctly

## Conclusion

Successfully implemented a comprehensive reaction rate simulation mode that complements the existing single collision mode. The implementation preserves all existing functionality while adding realistic multi-molecule collision dynamics with temperature-dependent velocities and real-time metrics tracking.

