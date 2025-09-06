// Type definitions
interface MolHeader {
  title: string;
  program: string;
  timeStamp: string;
  comment: string;
}

interface MolCounts {
  molecules: string; // Number of atoms
  bonds: string;     // Number of bonds
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
  let molObj: MolObject = {} as MolObject; // Initialize the object to store the parsed data.
  
  // Handle PubChem's extended format - extract just the MOL part
  let molContent = molFile;
  const molEndIndex = molFile.indexOf('$$$$');
  if (molEndIndex !== -1) {
    molContent = molFile.substring(0, molEndIndex + 4); // Include the $$$$ line
  }
  
  const split: string[] = molContent.split('\n'); // Split the molFile content into lines.

  // --- Parse Header Section ---
  molObj.header = {} as MolHeader;
  molObj.header.title = split[0]; // First line is the title.
  molObj.header.program = split[1].split('  ')[1]; // Second line: program name. Splitting by two spaces.
  molObj.header.timeStamp = split[1].split('  ')[2]; // Second line: timestamp. Splitting by two spaces.
  molObj.header.comment = split[2]; // Third line is the comment.

  // --- Parse Counts Line ---
  molObj.counts = {} as MolCounts;

  const countChunks: string[] = [];
  // Iterate through the 4th line (counts line) in chunks of 3 characters.
  for (let i = 0; i < split[3].length; i += 3) {
    countChunks.push(split[3].slice(i, i + 3)); // Extract 3-character chunks.
  }

  molObj.counts.molecules = countChunks[0].trim(); // Number of atoms.
  molObj.counts.bonds = countChunks[1].trim();     // Number of bonds.
  molObj.counts.lists = countChunks[2].trim();
  molObj.counts.chiral = countChunks[4].trim() == '1' ? true : false; // Chiral flag.
  molObj.counts.stext = countChunks[5];           // Stext

  // --- Parse Atom Data ---
  const atomsArray: Atom[] = [];
  // Iterate through the lines containing atom data. Starts at line 5 (index 4).
  for (let i = 4; i < 4 + parseInt(molObj.counts.molecules); i++) {
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
  // Iterate through the lines containing bond data.
  const bondsStartIndex: number = 4 + parseInt(molObj.counts.molecules);
  const bondsEndIndex: number = bondsStartIndex + parseInt(molObj.counts.bonds);
  for (let i = bondsStartIndex; i < bondsEndIndex; i++) {
    // Extract the atom indices that are connected by the bond.
    const bond: [string, string] = [split[i].slice(0, 3).trim(), split[i].slice(3, 6).trim()];
    bondsArray.push(bond); // Add the bond (pair of atom indices) to the array.
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