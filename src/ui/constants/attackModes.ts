// Predefined attack modes with chemical significance
export const ATTACK_MODES = [
  {
    id: 'backside-sn2',
    name: 'Backside SN2 Attack',
    description: 'Optimal SN2 nucleophilic substitution',
    approachAngle: 180,
    impactParameter: 0.0,
    relativeVelocity: 15.0
  },
  {
    id: 'front-attack',
    name: 'Front Attack',
    description: 'Direct frontal approach (less favorable)',
    approachAngle: 0,
    impactParameter: 0.0,
    relativeVelocity: 20.0
  },
  {
    id: 'side-attack',
    name: 'Side Attack',
    description: 'Lateral approach (steric hindrance)',
    approachAngle: 90,
    impactParameter: 0.0,
    relativeVelocity: 18.0
  },
  {
    id: 'missed-collision',
    name: 'Missed Collision',
    description: 'Lateral miss with no reaction',
    approachAngle: 180,
    impactParameter: 2.0,
    relativeVelocity: 12.0
  },
  {
    id: 'grazing-hit',
    name: 'Grazing Hit',
    description: 'Partial contact, low reaction probability',
    approachAngle: 135,
    impactParameter: 1.0,
    relativeVelocity: 16.0
  }
];

export type AttackMode = typeof ATTACK_MODES[0];



