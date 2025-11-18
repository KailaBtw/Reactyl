// Type definitions
interface MolHeader {
  title: string;
  program: string;
  timeStamp: string;
  comment: string;
}

interface MolCounts {
  molecules: string; // Number of atoms
  bonds: string; // Number of bonds
  lists: string;
  chiral: boolean;
  stext: string;
}

interface Atom {
  position: {
    x: string;
    y: string;
    z: string;
  };
  type: string;
}

interface MolObject {
  header: MolHeader;
  counts: MolCounts;
  atoms: Atom[];
  bonds: [string, string][]; // [atomIndex1, atomIndex2]
}

interface PubChemMetadata {
  cid?: string;
  name?: string;
  title?: string;
  synonyms?: string[];
  molecularFormula?: string;
  molecularWeight?: string;
  smiles?: string;
  inchi?: string;
}

/**
 * Parses a .mol file string and converts it into a JavaScript object.
 *
 * This function takes the content of a .mol file (as a string) and extracts the
 * relevant information, such as header data, atom positions, and bond connections,
 * organizing it into a structured JSON-like object.
 *
 * @param molFile - The content of the .mol file as a string.
 * @returns A JavaScript object representing the molecule data. The object
 * has the following structure:
 *
 * {
 * header: {
 * title: string,
 * program: string,
 * timeStamp: string,
 * comment: string
 * },
 * counts: {
 * molecules: string, // Number of atoms
 * bonds: string,     // Number of bonds
 * lists: string,
 * chiral: boolean,
 * stext: string
 * },
 * atoms: [
 * {
 * position: {
 * x: string,
 * y: string,
 * z: string
 * },
 * type: string
 * },
 * ...
 * ],
 * bonds: [
 * [string, string], // [atomIndex1, atomIndex2]
 * ...
 * ]
 * }
 */
export function molFileToJSON(molFile: string): MolObject {
  const molObj: MolObject = {} as MolObject; // Initialize the object to store the parsed data.

  // Handle PubChem's extended format - extract just the MOL part
  let molContent = molFile;
  const molEndIndex = molFile.indexOf('$$$$');
  if (molEndIndex !== -1) {
    molContent = molFile.substring(0, molEndIndex + 4); // Include the $$$$ line
  }

  const split: string[] = molContent.split('\n'); // Split the molFile content into lines.

  // --- Parse Header Section ---
  molObj.header = {} as MolHeader;
  molObj.header.title = split[0] || ''; // First line is the title.

  // Safely parse second line with defensive programming
  if (split[1]) {
    const secondLineParts = split[1].split('  ');
    molObj.header.program = secondLineParts[1] || '';
    molObj.header.timeStamp = secondLineParts[2] || '';
  } else {
    molObj.header.program = '';
    molObj.header.timeStamp = '';
  }

  molObj.header.comment = split[2] || ''; // Third line is the comment.

  // --- Parse Counts Line ---
  molObj.counts = {} as MolCounts;

  // Check if we have enough lines for a valid MOL file
  if (split.length < 4) {
    console.error(
      'Invalid MOL file: Not enough lines. Expected at least 4 lines, got:',
      split.length
    );
    console.error('MOL file content:', molContent);
    throw new Error('Invalid MOL file format: Not enough lines');
  }

  const countChunks: string[] = [];
  // Safely iterate through the 4th line (counts line) in chunks of 3 characters.
  if (split[3] && split[3].length > 0) {
    for (let i = 0; i < split[3].length; i += 3) {
      countChunks.push(split[3].slice(i, i + 3)); // Extract 3-character chunks.
    }
  } else {
    console.error('Invalid MOL file: Counts line is empty or undefined');
    throw new Error('Invalid MOL file format: Counts line is empty');
  }

  molObj.counts.molecules = countChunks[0]?.trim() || '0'; // Number of atoms.
  molObj.counts.bonds = countChunks[1]?.trim() || '0'; // Number of bonds.
  molObj.counts.lists = countChunks[2]?.trim() || '0';
  molObj.counts.chiral = countChunks[4]?.trim() === '1'; // Chiral flag.
  molObj.counts.stext = countChunks[5] || ''; // Stext

  // --- Parse Atom Data ---
  const atomsArray: Atom[] = [];

  // Check if we have enough lines for atom data
  const numAtoms = parseInt(molObj.counts.molecules, 10) || 0;
  if (numAtoms > 0 && split.length < 4 + numAtoms) {
    console.error(
      'Invalid MOL file: Not enough lines for atom data. Expected at least',
      4 + numAtoms,
      'lines, got:',
      split.length
    );
    throw new Error('Invalid MOL file format: Not enough lines for atom data');
  }

  // Iterate through the lines containing atom data. Starts at line 5 (index 4).
  for (let i = 4; i < 4 + numAtoms; i++) {
    const atom: Atom = {} as Atom;
    atom.position = {} as Atom['position'];
    // Extract x, y, z coordinates from the line (character positions are fixed in .mol format).
    atom.position.x = split[i].slice(0, 10).trim();
    atom.position.y = split[i].slice(10, 20).trim();
    atom.position.z = split[i].slice(20, 30).trim();
    atom.type = split[i].slice(31, 33).trim(); // Atom type (e.g., "C", "O").
    atomsArray.push(atom); // Add the atom object to the array.
  }
  molObj.atoms = atomsArray; // Assign the array of atom objects.

  // --- Parse Bond Data ---
  const bondsArray: [string, string][] = [];

  // Check if we have enough lines for bond data
  const numBonds = parseInt(molObj.counts.bonds, 10) || 0;
  const bondsStartIndex: number = 4 + numAtoms;
  const bondsEndIndex: number = bondsStartIndex + numBonds;

  if (numBonds > 0 && split.length < bondsEndIndex) {
    console.error(
      'Invalid MOL file: Not enough lines for bond data. Expected at least',
      bondsEndIndex,
      'lines, got:',
      split.length
    );
    throw new Error('Invalid MOL file format: Not enough lines for bond data');
  }

  // Iterate through the lines containing bond data.
  for (let i = bondsStartIndex; i < bondsEndIndex; i++) {
    if (split[i]) {
      // Extract the atom indices that are connected by the bond.
      const bond: [string, string] = [split[i].slice(0, 3).trim(), split[i].slice(3, 6).trim()];
      bondsArray.push(bond); // Add the bond (pair of atom indices) to the array.
    }
  }
  molObj.bonds = bondsArray; // Assign the array of bond connections.

  return molObj; // Return the complete parsed molecule object.
}

/**
 * Extracts PubChem metadata from extended MOL format
 */
export function extractPubChemMetadata(molFile: string): PubChemMetadata {
  const metadata: PubChemMetadata = {};

  // Look for PubChem metadata after the MOL structure
  const lines = molFile.split('\n');
  let inPropertyTable = false;

  for (const line of lines) {
    if (line.includes('PropertyTable')) {
      inPropertyTable = true;
      continue;
    }

    if (inPropertyTable) {
      if (line.includes('CID')) {
        const match = line.match(/CID\s+(\d+)/);
        if (match) metadata.cid = match[1];
      } else if (line.includes('MolecularFormula')) {
        const match = line.match(/MolecularFormula\s+"([^"]+)"/);
        if (match) metadata.molecularFormula = match[1];
      } else if (line.includes('MolecularWeight')) {
        const match = line.match(/MolecularWeight\s+"([^"]+)"/);
        if (match) metadata.molecularWeight = match[1];
      } else if (line.includes('ConnectivitySMILES')) {
        const match = line.match(/ConnectivitySMILES\s+"([^"]+)"/);
        if (match) metadata.smiles = match[1];
      } else if (line.includes('InChI')) {
        const match = line.match(/InChI\s+"([^"]+)"/);
        if (match) metadata.inchi = match[1];
      }
    }
  }

  return metadata;
}
