# Reactyl

### Overview

Reactyl is a web application for visualizing and interacting with 3D molecular structures. It allows users to load, display, and manipulate molecules in a 3D environment.

![Image of the program](./src/assets/program_image.png)

## Features

* 3D Molecular Visualization
* Load molecules from local .mol files
* Interactive 3D scene controls
* GUI for molecule selection and manipulation
* Multiple molecules move and interact
* PubChem integration with smart caching
* Real-time molecular data fetching

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

### Start backend server (for cache API)

```
npm run backend
```


### Deploy the application to GitHub Pages:

```
npm run deploy
```

### Fix Permissions Issue (Linux/macOS)

-If you encounter permissions issues, you may need to adjust file ownership:

```
sudo chown -R kaila:kaila ../reactyl/ && sudo chown -R kaila ../reactyl/
```

</details>

<details><summary>Cache System (Click to expand)</summary>

### Development Mode
- Backend server saves cache to project files
- Real-time updates to `public/cache/chemical_cache.json`
- PubChem API integration with throttling

### Production Mode  
- Cache loaded from localStorage on startup
- All processing done in memory
- Updates saved back to localStorage automatically
- Download cache as JSON file (optional)
- Works on static hosting (GitHub Pages)

### Cache Workflow
1. **User searches for molecule** → Check cache first
2. **Cache miss** → Fetch from PubChem API (with throttling)
3. **Process molecule data** → Parse MOL file, extract properties
4. **Update in-memory cache** → Store molecule and search results
5. **Save to storage**:
   - **Development**: POST to backend → Write to project file
   - **Production**: Save to localStorage
6. **Future searches** → Load from cache (instant)

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

[reactyl]: http://localhost:5500/reactyl/



