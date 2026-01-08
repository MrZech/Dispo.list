import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register Auth and Object Storage
  await setupAuth(app);
  registerAuthRoutes(app);
  registerObjectStorageRoutes(app);

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

  // Initialize seed data
  seedDatabase();

  return httpServer;
}

async function seedDatabase() {
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
      dropoffType: "pickup"
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
