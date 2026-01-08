import { z } from 'zod';
import { insertItemSchema, insertPhotoSchema, insertExportProfileSchema, items, photos, exportProfiles } from './schema';

// Error Schemas
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// API Contract
export const api = {
  items: {
    list: {
      method: 'GET' as const,
      path: '/api/items',
      input: z.object({
        status: z.string().optional(),
        search: z.string().optional(),
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof items.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/items/:id',
      responses: {
        200: z.custom<typeof items.$inferSelect & { photos: typeof photos.$inferSelect[] }>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/items',
      input: insertItemSchema,
      responses: {
        201: z.custom<typeof items.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/items/:id',
      input: insertItemSchema.partial(),
      responses: {
        200: z.custom<typeof items.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/items/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  photos: {
    list: {
      method: 'GET' as const,
      path: '/api/items/:itemId/photos',
      responses: {
        200: z.array(z.custom<typeof photos.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/items/:itemId/photos',
      input: insertPhotoSchema.omit({ itemId: true }),
      responses: {
        201: z.custom<typeof photos.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/photos/:id',
      responses: {
        204: z.void(),
      },
    },
    reorder: {
      method: 'PATCH' as const,
      path: '/api/items/:itemId/photos/reorder',
      input: z.object({
        photoIds: z.array(z.number()), // Array of IDs in new order
      }),
      responses: {
        200: z.void(),
      },
    }
  },
  exportProfiles: {
    list: {
      method: 'GET' as const,
      path: '/api/export-profiles',
      responses: {
        200: z.array(z.custom<typeof exportProfiles.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/export-profiles',
      input: insertExportProfileSchema,
      responses: {
        201: z.custom<typeof exportProfiles.$inferSelect>(),
      },
    },
  },
  csv: {
    generate: {
      method: 'POST' as const,
      path: '/api/csv/generate',
      input: z.object({
        profileId: z.number(),
        itemIds: z.array(z.number()),
      }),
      responses: {
        200: z.any(), // File download
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
