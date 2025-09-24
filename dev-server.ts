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

// ===================================================================
// Enhanced Structure Cache Endpoints
// ===================================================================

// API endpoint to save enhanced molecular structure
app.post('/api/save-structure', async (req: Request, res: Response) => {
  try {
    const { cid, enhancedData } = req.body;
    
    if (!cid || !enhancedData) {
      return res.status(400).json({ success: false, error: 'CID and enhancedData are required' });
    }
    
    console.log(`🔄 POST /api/save-structure - Saving enhanced structure ${cid}`);
    
    const structuresDir = path.join(__dirname, 'public', 'cache', 'structures');
    await fs.mkdir(structuresDir, { recursive: true });
    
    const structurePath = path.join(structuresDir, `${cid}.json`);
    await fs.writeFile(structurePath, JSON.stringify(enhancedData, null, 2));
    
    console.log(`✅ Enhanced structure saved to: ${structurePath}`);
    res.json({ success: true, message: `Enhanced structure ${cid} saved successfully` });
  } catch (error) {
    console.error('❌ Error saving enhanced structure:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API endpoint to get enhanced molecular structure
app.get('/api/structure/:cid', async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;
    const structurePath = path.join(__dirname, 'public', 'cache', 'structures', `${cid}.json`);
    
    console.log(`📖 GET /api/structure/${cid} - Reading from: ${structurePath}`);
    
    const structureData = await fs.readFile(structurePath, 'utf-8');
    const parsed = JSON.parse(structureData);
    
    console.log(`📖 Enhanced structure loaded: ${cid}`);
    res.json(parsed);
  } catch (error) {
    console.log(`❌ Enhanced structure ${req.params.cid} not found: ${error}`);
    res.status(404).json({ error: `Enhanced structure ${req.params.cid} not found` });
  }
});

// ===================================================================
// RXN Reaction Cache Endpoints
// ===================================================================

// API endpoint to save RXN reaction prediction
app.post('/api/save-reaction', async (req: Request, res: Response) => {
  try {
    const { cacheKey, reactionData } = req.body;
    
    if (!cacheKey || !reactionData) {
      return res.status(400).json({ success: false, error: 'CacheKey and reactionData are required' });
    }
    
    console.log(`🔄 POST /api/save-reaction - Saving reaction ${cacheKey}`);
    
    const reactionsDir = path.join(__dirname, 'public', 'cache', 'reactions');
    await fs.mkdir(reactionsDir, { recursive: true });
    
    const reactionPath = path.join(reactionsDir, `${cacheKey}.json`);
    await fs.writeFile(reactionPath, JSON.stringify(reactionData, null, 2));
    
    console.log(`✅ Reaction saved to: ${reactionPath}`);
    res.json({ success: true, message: `Reaction ${cacheKey} saved successfully` });
  } catch (error) {
    console.error('❌ Error saving reaction:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API endpoint to get RXN reaction prediction
app.get('/api/reaction/:cacheKey', async (req: Request, res: Response) => {
  try {
    const { cacheKey } = req.params;
    const reactionPath = path.join(__dirname, 'public', 'cache', 'reactions', `${cacheKey}.json`);
    
    console.log(`📖 GET /api/reaction/${cacheKey} - Reading from: ${reactionPath}`);
    
    const reactionData = await fs.readFile(reactionPath, 'utf-8');
    const parsed = JSON.parse(reactionData);
    
    console.log(`📖 Reaction loaded: ${cacheKey}`);
    res.json(parsed);
  } catch (error) {
    console.log(`❌ Reaction ${req.params.cacheKey} not found: ${error}`);
    res.status(404).json({ error: `Reaction ${req.params.cacheKey} not found` });
  }
});

// API endpoint to get all cached reactions
app.get('/api/reactions', async (_req: Request, res: Response) => {
  try {
    const reactionsDir = path.join(__dirname, 'public', 'cache', 'reactions');
    console.log(`📖 GET /api/reactions - Reading from: ${reactionsDir}`);
    
    try {
      const files = await fs.readdir(reactionsDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      console.log(`📖 Found ${jsonFiles.length} reaction files`);
      res.json({
        reactions: jsonFiles.map(file => file.replace('.json', '')),
        count: jsonFiles.length
      });
    } catch (_error) {
      // Directory doesn't exist yet
      console.log(`📖 No reactions directory found`);
      res.json({ reactions: [], count: 0 });
    }
  } catch (error) {
    console.log(`❌ Error reading reactions: ${error}`);
    res.status(500).json({ error: 'Error reading reactions' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Development server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`💾 Save molecule: POST http://localhost:${PORT}/api/save-molecule`);
  console.log(`📖 Get molecules: GET http://localhost:${PORT}/api/molecules`);
  console.log(`📖 Get molecule: GET http://localhost:${PORT}/api/molecule/:cid`);
  console.log(`🧬 Save structure: POST http://localhost:${PORT}/api/save-structure`);
  console.log(`🧬 Get structure: GET http://localhost:${PORT}/api/structure/:cid`);
  console.log(`⚗️  Save reaction: POST http://localhost:${PORT}/api/save-reaction`);
  console.log(`⚗️  Get reactions: GET http://localhost:${PORT}/api/reactions`);
  console.log(`⚗️  Get reaction: GET http://localhost:${PORT}/api/reaction/:cacheKey`);
  console.log(`📄 Static files: http://localhost:${PORT}/cache/`);
});
