#!/usr/bin/env node

import express, { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// API endpoint to save cache
app.post('/api/save-cache', async (req: Request, res: Response) => {
  try {
    const cacheData = req.body;
    const cachePath = path.join(__dirname, 'data', 'cache', 'chemical_cache.json');
    
    console.log(`📝 Received cache data:`, Object.keys(cacheData));
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(cachePath), { recursive: true });
    
    // Write cache file
    await fs.writeFile(cachePath, JSON.stringify(cacheData, null, 2));
    
    console.log(`✅ Cache saved to: ${cachePath}`);
    res.json({ success: true, message: 'Cache saved successfully' });
  } catch (error) {
    console.error('❌ Error saving cache:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// API endpoint to get cache (for debugging)
app.get('/api/cache', async (req: Request, res: Response) => {
  try {
    const cachePath = path.join(__dirname, 'data', 'cache', 'chemical_cache.json');
    const cacheData = await fs.readFile(cachePath, 'utf-8');
    res.json(JSON.parse(cacheData));
  } catch (error) {
    res.status(404).json({ error: 'Cache file not found' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Development server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`💾 Cache API: POST http://localhost:${PORT}/api/save-cache`);
  console.log(`📖 Cache API: GET http://localhost:${PORT}/api/cache`);
  console.log(`📄 Static files: http://localhost:${PORT}/data/cache/chemical_cache.json`);
});
