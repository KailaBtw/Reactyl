const MAX_VISUAL_VELOCITY = 500; // m/s cap for visually trackable collisions

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const getEnergyRange = (activationEnergy: number) => {
  const min = 0; // Start from 0 so graph baseline matches slider minimum
  const max = activationEnergy + 10;
  return { min, max };
};

export const energyFromVelocityScaled = (velocity: number, activationEnergy: number): number => {
  const { min, max } = getEnergyRange(activationEnergy);
  if (max <= min) {
    return min;
  }
  const clampedVelocity = clamp(velocity || 0, 0, MAX_VISUAL_VELOCITY);
  const ratio = clampedVelocity / MAX_VISUAL_VELOCITY;
  return min + ratio * (max - min);
};

export const velocityFromEnergyScaled = (energy: number, activationEnergy: number): number => {
  const { min, max } = getEnergyRange(activationEnergy);
  if (max <= min) {
    return 0;
  }
  const clampedEnergy = clamp(energy, min, max);
  const ratio = (clampedEnergy - min) / (max - min);
  return ratio * MAX_VISUAL_VELOCITY;
};

