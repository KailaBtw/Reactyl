# MolMod - Molecular Modeler

## Configuration Directions

* Keep track of configuration and setup directions

###  Setup Instructions

```{BASH}
npm init
npm install three
nvm install 20
nvm use 20

# set up nodemon
npm install nodemon -g
nodemon mol_mod
```

### Run instructions

* Use VScode "Run in liveserver"
* Navigate to [Molecular Modeler localhost][mol_mod]

## 'mol' Format Explanation

* The first three lines of a mol file contain information about the file itself
    * name
    * the program that created the file
    * comments (and sometimes data)

* Fourth line contains information about the molecule - mol files are arranged in a fixed-width format, with each line containing a fixed number of characters. 
    *  The first three characters of each line contain the number of atoms in the molecule.
    * The next three characters contain the number of bonds.
    * the next six characters contain the number of charges
    * the number of isotopes
    * the number of stereo centers
    * the number of stereo bonds
    * the number of unknown properties

* The next six characters are reserved for future use

* the last three characters are used to indicate the version of the mol file format.

## Todo List

### Backend Changes

* Move deployment into a docker container!
* Add prettier formatter
* Add code linter for static analysis
* Make bot for fetching .mol files from ChemSpider
    * iterate over to get many

### Frontend Changes

* add Favicon
    * https://stackoverflow.com/questions/1837261/how-to-animate-a-favicon
    * https://favicon.io/



[mol_mod]: http://localhost:5500/mol_mod/