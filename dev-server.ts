#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} from ${req.get('Origin') || 'unknown'}`);

  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.static('.'));

// API endpoint to save individual molecule
app.post('/api/save-molecule', async (req: Request, res: Response) => {
  try {
    const { cid, molecularData } = req.body;

    if (!cid || !molecularData) {
      return res.status(400).json({ success: false, error: 'CID and molecularData are required' });
    }

    console.log(`🔄 POST /api/save-molecule - Saving CID ${cid}`);

    // Create molecules directory
    const moleculesDir = path.join(__dirname, 'public', 'cache', 'molecules');
    await fs.mkdir(moleculesDir, { recursive: true });

    // Save individual molecule file
    const moleculePath = path.join(moleculesDir, `${cid}.json`);
    await fs.writeFile(moleculePath, JSON.stringify(molecularData, null, 2));

    console.log(`✅ Molecule saved to: ${moleculePath}`);
    res.json({ success: true, message: `Molecule ${cid} saved successfully` });
  } catch (error) {
    console.error('❌ Error saving molecule:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API endpoint to get all molecules
app.get('/api/molecules', async (_req: Request, res: Response) => {
  try {
    const moleculesDir = path.join(__dirname, 'public', 'cache', 'molecules');
    console.log(`📖 GET /api/molecules - Reading from: ${moleculesDir}`);

    try {
      const files = await fs.readdir(moleculesDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));

      console.log(`📖 Found ${jsonFiles.length} molecule files`);
      res.json({
        molecules: jsonFiles.map(file => file.replace('.json', '')),
        count: jsonFiles.length,
      });
    } catch (_error) {
      // Directory doesn't exist yet
      console.log(`📖 No molecules directory found`);
      res.json({ molecules: [], count: 0 });
    }
  } catch (error) {
    console.log(`❌ Error reading molecules: ${error}`);
    res.status(500).json({ error: 'Error reading molecules' });
  }
});

// API endpoint to get specific molecule
app.get('/api/molecule/:cid', async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;
    const moleculePath = path.join(__dirname, 'public', 'cache', 'molecules', `${cid}.json`);

    console.log(`📖 GET /api/molecule/${cid} - Reading from: ${moleculePath}`);

    const moleculeData = await fs.readFile(moleculePath, 'utf-8');
    const parsed = JSON.parse(moleculeData);

    console.log(`📖 Molecule loaded: ${parsed.formula || 'Unknown'}`);
    res.json(parsed);
  } catch (error) {
    console.log(`❌ Molecule ${req.params.cid} not found: ${error}`);
    res.status(404).json({ error: `Molecule ${req.params.cid} not found` });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Development server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`💾 Save molecule: POST http://localhost:${PORT}/api/save-molecule`);
  console.log(`📖 Get molecules: GET http://localhost:${PORT}/api/molecules`);
  console.log(`📖 Get molecule: GET http://localhost:${PORT}/api/molecule/:cid`);
  console.log(`📄 Static files: http://localhost:${PORT}/cache/molecules/`);
});
