// Type definitions
interface Molecule {
  CSID: number;
  name: string;
}

interface MoleculesEnum {
  CAFFEINE: Molecule;
  ETHANOL: Molecule;
  NEPETALACTONE: Molecule;
  CINNAMALDEHYDE: Molecule;
}

const Molecules: MoleculesEnum = {
  CAFFEINE: {
    CSID: 2424,
    name: 'Caffeine (Coffee, Chocolate, Tea)',
  },
  ETHANOL: {
    CSID: 682,
    name: 'Ethanol (Alcohol)',
  },
  NEPETALACTONE: {
    CSID: 141747,
    name: 'Nepetalactone (Catnip)',
  },
  CINNAMALDEHYDE: {
    CSID: 553117,
    name: 'Cinnamaldehyde (Cinnamon)',
  },
};

export { Molecules }; // Export the enum
