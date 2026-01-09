import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupLocalAuth, registerLocalAuthRoutes, ensureDefaultAdmin, isAuthenticated, isAdmin } from "./auth";
import { registerLocalStorageRoutes } from "./local-storage";
import { db } from "./db";
import { sql } from "drizzle-orm";

import { generateCSV } from "./lib/csv-generator";
import { generateEbayDraftCSV } from "./lib/ebay-csv-generator";
import { 
  buildPromptFromSpecs, 
  buildPromptFromItem, 
  generateEbayScriptStreaming,
  type ItemSpecs 
} from "./lib/ebay-script-generator";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register Local Auth and File Storage
  await setupLocalAuth(app);
  registerLocalAuthRoutes(app);
  registerLocalStorageRoutes(app);

  // === ITEMS ===
  
  app.get(api.items.list.path, async (req, res) => {
    try {
      // Basic implementation, filters can be added to storage
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to list items" });
    }
  });

  app.get(api.items.get.path, async (req, res) => {
    const item = await storage.getItem(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }
    res.json(item);
  });

  app.post(api.items.create.path, async (req, res) => {
    try {
      const input = api.items.create.input.parse(req.body);
      
      // Auto-assign creator if logged in
      const userId = (req.user as any)?.claims?.sub;
      if (userId) {
        input.createdBy = userId;
      }
      
      const item = await storage.createItem(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      // Check for unique constraint violation (SKU)
      if ((err as any).code === '23505') {
        return res.status(400).json({
           message: "SKU already exists",
           field: "sku"
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put(api.items.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.items.update.input.parse(req.body);
      const updated = await storage.updateItem(id, input);
      if (!updated) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.items.delete.path, async (req, res) => {
    await storage.deleteItem(Number(req.params.id));
    res.status(204).send();
  });

  // === PHOTOS ===

  app.get(api.photos.list.path, async (req, res) => {
    const photos = await storage.getPhotos(Number(req.params.itemId));
    res.json(photos);
  });

  app.post(api.photos.create.path, async (req, res) => {
    try {
      const itemId = Number(req.params.itemId);
      const input = api.photos.create.input.parse(req.body);
      const photo = await storage.addPhoto({ ...input, itemId });
      res.status(201).json(photo);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      res.status(500).json({ message: "Failed to add photo" });
    }
  });

  app.patch(api.photos.reorder.path, async (req, res) => {
    try {
      const { photoIds } = api.photos.reorder.input.parse(req.body);
      await storage.reorderPhotos(photoIds);
      res.status(200).send();
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.photos.delete.path, async (req, res) => {
    await storage.deletePhoto(Number(req.params.id));
    res.status(204).send();
  });

  // === EXPORT PROFILES ===

  app.get(api.exportProfiles.list.path, async (req, res) => {
    const profiles = await storage.getExportProfiles();
    res.json(profiles);
  });

  app.post(api.exportProfiles.create.path, async (req, res) => {
    try {
      const input = api.exportProfiles.create.input.parse(req.body);
      const profile = await storage.createExportProfile(input);
      res.status(201).json(profile);
    } catch (err) {
       res.status(400).json({ message: "Invalid input" });
    }
  });

  // === CSV GENERATION ===

  app.post(api.csv.generate.path, async (req, res) => {
    try {
      const { profileId, itemIds } = api.csv.generate.input.parse(req.body);
      
      const profile = (await storage.getExportProfiles()).find(p => p.id === profileId);
      if (!profile) {
        return res.status(404).json({ message: "Export profile not found" });
      }

      const items = await storage.getItemsByIds(itemIds);
      if (items.length === 0) {
        return res.status(400).json({ message: "No items found for the provided IDs" });
      }

      const csvContent = generateCSV(items, profile);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ebay-export-${new Date().toISOString()}.csv"`);
      res.send(csvContent);

    } catch (err) {
      console.error("CSV Generation Error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input" });
      }
      res.status(500).json({ message: "Failed to generate CSV" });
    }
  });

  // === EBAY CSV EXPORT ===

  app.post(api.csv.ebayExport.path, async (req, res) => {
    try {
      const { itemIds } = api.csv.ebayExport.input.parse(req.body);

      const items = await storage.getItemsByIds(itemIds);
      if (items.length === 0) {
        return res.status(400).json({ message: "No items found for the provided IDs" });
      }

      const result = generateEbayDraftCSV(items);

      if (result.exportedCount === 0) {
        return res.status(400).json({ 
          message: "No items have the required Category ID and Condition ID for eBay export",
          skipped: result.skippedSkus
        });
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ebay-draft-listing-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.setHeader('X-Exported-Count', String(result.exportedCount));
      res.setHeader('X-Skipped-Count', String(result.skippedCount));
      res.send(result.csv);

    } catch (err) {
      console.error("eBay CSV Export Error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input" });
      }
      res.status(500).json({ message: "Failed to generate eBay CSV" });
    }
  });

  // === EBAY SCRIPT GENERATOR ===

  // Generate prompt from item ID
  app.get("/api/ebay-script/prompt/:itemId", async (req, res) => {
    try {
      const itemId = Number(req.params.itemId);
      const item = await storage.getItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      const prompt = buildPromptFromItem(item);
      res.json({ prompt, item });
    } catch (error) {
      console.error("Error generating prompt:", error);
      res.status(500).json({ message: "Failed to generate prompt" });
    }
  });

  // Generate prompt from raw specs (for pasted Magic Octopus data)
  app.post("/api/ebay-script/prompt", async (req, res) => {
    try {
      const specs = req.body as ItemSpecs;
      if (!specs.sku) {
        return res.status(400).json({ message: "SKU is required" });
      }
      const prompt = buildPromptFromSpecs(specs);
      res.json({ prompt });
    } catch (error) {
      console.error("Error generating prompt:", error);
      res.status(500).json({ message: "Failed to generate prompt" });
    }
  });

  // Generate eBay script via AI (streaming)
  app.post("/api/ebay-script/generate", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      await generateEbayScriptStreaming(prompt, (content) => {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error generating eBay script:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to generate script" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: "Failed to generate script" });
      }
    }
  });

  // === ADMIN DATABASE ROUTES ===

  // Get database tables info (admin only)
  app.get("/api/admin/database/tables", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      res.json(result.rows);
    } catch (err) {
      console.error("Database tables error:", err);
      res.status(500).json({ message: "Failed to get tables" });
    }
  });

  // Get table row counts (admin only)
  app.get("/api/admin/database/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const tables = ['items', 'photos', 'users', 'sessions', 'export_profiles'];
      const stats: Record<string, number> = {};
      
      for (const table of tables) {
        try {
          const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM "${table}"`));
          stats[table] = Number((result.rows[0] as any)?.count || 0);
        } catch {
          stats[table] = 0;
        }
      }
      
      res.json(stats);
    } catch (err) {
      console.error("Database stats error:", err);
      res.status(500).json({ message: "Failed to get database stats" });
    }
  });

  // Run read-only SQL query (admin only)
  app.post("/api/admin/database/query", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Query is required" });
      }
      
      // Basic safety check - only allow SELECT queries
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery.startsWith("select")) {
        return res.status(400).json({ message: "Only SELECT queries are allowed" });
      }
      
      // Block dangerous keywords
      const dangerousKeywords = ['drop', 'delete', 'update', 'insert', 'alter', 'truncate', 'create'];
      for (const keyword of dangerousKeywords) {
        if (normalizedQuery.includes(keyword)) {
          return res.status(400).json({ message: `Query contains blocked keyword: ${keyword}` });
        }
      }
      
      const result = await db.execute(sql.raw(query));
      res.json({ rows: result.rows, rowCount: result.rows.length });
    } catch (err) {
      console.error("Database query error:", err);
      res.status(500).json({ message: `Query failed: ${(err as Error).message}` });
    }
  });

  // Initialize database
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  // Ensure default admin exists
  await ensureDefaultAdmin();
  
  const existingItems = await storage.getItems();
  if (existingItems.length === 0) {
    console.log("Seeding database with initial items...");
    
    await storage.createItem({
      sku: "DELL-XPS-001",
      status: "intake",
      category: "Laptop",
      source: "Office Liquidation A",
      intakeNotes: "Screen looks good, no charger.",
      brand: "Dell",
      model: "XPS 13 9310",
      powerTest: true,
      dropoffType: "pickup",
      intakeConfirmedBy: undefined
    });

    await storage.createItem({
      sku: "HP-MON-042",
      status: "processing",
      category: "Monitor",
      source: "Individual Dropoff",
      intakeNotes: "Has scratches on bezel.",
      brand: "HP",
      model: "E243i",
      powerTest: true,
      benchTested: true,
      testNotes: "Display is clear, no dead pixels.",
      dropoffType: "dropoff"
    });

    console.log("Seeding complete.");
  }
}
