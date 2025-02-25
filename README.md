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