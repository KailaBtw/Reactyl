export const MOL_FILES = {
  METHYL_BROMIDE: `6323
  -OEChem-10132509453D

  5  4  0     0  0  0  0  0  0999 V2000
   -0.9674    0.0000    0.0000 Br  0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    1.0000    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000   -1.0000    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    0.0000    1.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  2  3  1  0  0  0  0
  2  4  1  0  0  0  0
  2  5  1  0  0  0  0
M  END`,

  HYDROXIDE_ION: `961
  -OEChem-10122522283D

  2  1  0     0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 O   0  5  0  0  0  0  0  0  0  0  0  0
    0.0000    0.0000    1.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
M  END`,

  METHYL_CHLORIDE: `6323
  -OEChem-10132509453D

  5  4  0     0  0  0  0  0  0999 V2000
   -0.9674    0.0000    0.0000 Cl  0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    1.0000    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000   -1.0000    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    0.0000    1.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  2  3  1  0  0  0  0
  2  4  1  0  0  0  0
  2  5  1  0  0  0  0
M  END`,

  WATER: `961
  -OEChem-10122522283D

  3  2  0     0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    0.0000    1.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    1.0000    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  1  3  1  0  0  0  0
M  END`,

  AMMONIA: `222
  -OEChem-10122522283D

  4  3  0     0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    0.0000    1.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    1.0000    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
    1.0000    0.0000    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  1  3  1  0  0  0  0
  1  4  1  0  0  0  0
M  END`
};

export const MOLECULE_PROPERTIES = {
  METHYL_BROMIDE: {
    totalMass: 94.94,
    boundingRadius: 2.21,
    atomCount: 5,
    bondCount: 4
  },
  HYDROXIDE_ION: {
    totalMass: 17.01,
    boundingRadius: 0.91,
    atomCount: 2,
    bondCount: 1
  },
  METHYL_CHLORIDE: {
    totalMass: 50.49,
    boundingRadius: 1.76,
    atomCount: 5,
    bondCount: 4
  },
  WATER: {
    totalMass: 18.02,
    boundingRadius: 0.96,
    atomCount: 3,
    bondCount: 2
  },
  AMMONIA: {
    totalMass: 17.03,
    boundingRadius: 1.02,
    atomCount: 4,
    bondCount: 3
  }
};

export const TEST_POSITIONS = {
  CENTER: { x: 0, y: 0, z: 0 },
  SUBSTRATE: { x: 0, y: 0, z: 7.5 },
  NUCLEOPHILE: { x: 0, y: 0, z: -7.5 },
  SIDE_ATTACK: { x: 5, y: 0, z: 0 },
  FRONT_ATTACK: { x: 0, y: 5, z: 0 }
};

export const TEST_VELOCITIES = {
  ZERO: { x: 0, y: 0, z: 0 },
  FORWARD: { x: 0, y: 0, z: 5 },
  BACKWARD: { x: 0, y: 0, z: -5 },
  SIDE: { x: 5, y: 0, z: 0 },
  HIGH_SPEED: { x: 0, y: 0, z: 15 }
};



