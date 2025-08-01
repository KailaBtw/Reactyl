# MolMod - Molecular Modeler

### Overview

MolMod is a web application for visualizing and interacting with 3D molecular structures. It allows users to load, display, and manipulate molecules in a 3D environment.

![Image of the program](./src/assets/program_image.png)

## Features

* 3D Molecular Visualization
* Load molecules from local .mol files
* Interactive 3D scene controls
* GUI for molecule selection and manipulation
* Multiple molecules move and interact

## Configuration Directions

<details><summary>New Setup Instructions (Click to expand)</summary>

To set up the development environment:

```bash
npm init
npm install
vite dev
```
</details>

<details><summary>Local development run instructions (Click to expand)</summary>

### Start a local development server

```
npm run dev
```


### Deploy the application to GitHub Pages:

```
npm run deploy
```

### Fix Permissions Issue (Linux/macOS)

-If you encounter permissions issues, you may need to adjust file ownership:

```
sudo chown -R kaila:kaila ../mol_mod/ && sudo chown -R kaila ../mol_mod/
```

</details>

## Data structure explanations

<details><summary>mol file format explanation (click to expand)</summary>

- The first three lines of a mol file contain information about the file itself

  - name
  - the program that created the file
  - comments (and sometimes data)

- Fourth line contains information about the molecule - mol files are arranged in a fixed-width format, with each line containing a fixed number of characters.

  - The first three characters of each line contain the number of atoms in the molecule.
  - The next three characters contain the number of bonds.
  - the next six characters contain the number of charges
  - the number of isotopes
  - the number of stereo centers
  - the number of stereo bonds
  - the number of unknown properties

- The next six characters are reserved for future use

- the last three characters are used to indicate the version of the mol file format.

</details>

## Todo List

<details><summary>Backend Changes (click to expand)</summary>

- move to gitlab? Use a sync task to keep both updated?
- Clean up Documentation and javadoc
- Clean up readme
- fix github pages being unable to access script.json or anything in assets
- switch to typescript
- Move deployment into a docker container!
- Add prettier formatter
- Add code linter for static analysis
- Make bot for fetching .mol files from ChemSpider
  - iterate over to get many
- Export .mol

</details>
<details><summary>Frontend Changes (click to expand)</summary>

- User can enter moler concentrations of inputs, and reaction rate makes the finished one
- Add a confined space parameter so molecules bounce back toward center and dont fly off to infinity and beyond.
- add Favicon
  - https://stackoverflow.com/questions/1837261/how-to-animate-a-favicon
  - https://favicon.io/

</details>

## Deliverables

<details><summary>Minimum Viable Product (MVP) Features: (click to expand)</summary>

-	Visualization of molecule structure with ball and stick models.
-	Ability to import molecule data (mol files).
-	Dynamic lighting in all parts of the scene, ensuing visibility.
-	User interface for changing simulation parameters.
-	Ability to scale molecule size, handle rotation, and motion.
-	Multiple molecules can move around the scene.
-	Molecular trajectories change in reaction to a collision.
-	Web-based deployment on Github Pages.

</details>
<details><summary>Capstone II Features: (click to expand)</summary>

-	Ability to save and load simulations.
-	User login systems that store program settings.
-	Transition project to Typescript deployment, ensure type safety.
-	Redesigned modern UI/UX in a Javascript framework, like React.
-	Output of molecular position and velocity data for basic analysis. (save to csv)
-	Simulation of simple diffusion and Brownian motion within the solution.
-	(Delighter) Collision mechanics that handle chemical reactions in the system. 

</details>

## Example Software

- https://molview.org/

[mol_mod]: http://localhost:5500/mol_mod/



