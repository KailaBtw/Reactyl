/**
 * Parses a .mol file string and converts it into a JavaScript object.
 *
 * This function takes the content of a .mol file (as a string) and extracts the
 * relevant information, such as header data, atom positions, and bond connections,
 * organizing it into a structured JSON-like object.
 *
 * @param {string} molFile - The content of the .mol file as a string.
 * @returns {object} - A JavaScript object representing the molecule data. The object
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
export function molFileToJSON(molFile) {
  let molObj = {}; // Initialize the object to store the parsed data.
  const split = molFile.split('\n'); // Split the molFile content into lines.

  // --- Parse Header Section ---
  molObj.header = {};
  molObj.header.title = split[0]; // First line is the title.
  molObj.header.program = split[1].split('  ')[1]; // Second line: program name.  Splitting by two spaces.
  molObj.header.timeStamp = split[1].split('  ')[2]; // Second line: timestamp. Splitting by two spaces.
  molObj.header.comment = split[2]; // Third line is the comment.

  // --- Parse Counts Line ---
  molObj.counts = {};

  const countChunks = [];
  // Iterate through the 4th line (counts line) in chunks of 3 characters.
  for (let i = 0; i < split[3].length; i += 3) {
    countChunks.push(split[3].slice(i, i + 3)); // Extract 3-character chunks.
  }

  molObj.counts.molecules = countChunks[0].trim(); // Number of atoms.
  molObj.counts.bonds = countChunks[1].trim();     // Number of bonds.
  molObj.counts.lists = countChunks[2].trim();
  molObj.counts.chiral = countChunks[4].trim() == 1 ? true : false; // Chiral flag.
  molObj.counts.stext = countChunks[5];           // Stext

  // --- Parse Atom Data ---
  const atomsArray = [];
  // Iterate through the lines containing atom data.  Starts at line 5 (index 4).
  for (let i = 4; i < 4 + parseInt(molObj.counts.molecules); i++) {
    const atom = {};
    atom.position = {};
    // Extract x, y, z coordinates from the line (character positions are fixed in .mol format).
    atom.position.x = split[i].slice(0, 10).trim();
    atom.position.y = split[i].slice(10, 20).trim();
    atom.position.z = split[i].slice(20, 30).trim();
    atom.type = split[i].slice(31, 33).trim(); // Atom type (e.g., "C", "O").
    atomsArray.push(atom); // Add the atom object to the array.
  }
  molObj.atoms = atomsArray; // Assign the array of atom objects.

  // --- Parse Bond Data ---
  const bondsArray = [];
  // Iterate through the lines containing bond data.
  const bondsStartIndex = 4 + parseInt(molObj.counts.molecules);
  const bondsEndIndex = bondsStartIndex + parseInt(molObj.counts.bonds);
  for (let i = bondsStartIndex; i < bondsEndIndex; i++) {
    // Extract the atom indices that are connected by the bond.
    const bond = [split[i].slice(0, 3).trim(), split[i].slice(3, 6).trim()];
    bondsArray.push(bond); // Add the bond (pair of atom indices) to the array.
  }
  molObj.bonds = bondsArray; // Assign the array of bond connections.

  return molObj; // Return the complete parsed molecule object.
}
