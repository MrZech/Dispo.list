import type { Express, RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Ensure upload directory exists
function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  }
});

export function registerLocalStorageRoutes(app: Express) {
  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    ensureUploadDir();
    next();
  }, (req, res, next) => {
    const filePath = path.join(UPLOAD_DIR, req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(path.resolve(filePath));
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  });

  // Upload single file
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const url = `/uploads/${req.file.filename}`;
    res.json({
      url,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });

  // Upload multiple files
  app.post('/api/upload/multiple', upload.array('files', 10), (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const results = files.map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    }));

    res.json(results);
  });

  // Get presigned URL (compatibility endpoint for existing frontend)
  app.post('/api/object-storage/presigned-url', (req, res) => {
    const { filename, contentType } = req.body;
    
    if (!filename) {
      return res.status(400).json({ message: 'Filename is required' });
    }

    // For local storage, we return a URL to our upload endpoint
    // The frontend will need to do a regular form upload instead of a presigned PUT
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(filename);
    const newFilename = `${uniqueSuffix}${ext}`;

    res.json({
      uploadUrl: '/api/upload',
      publicUrl: `/uploads/${newFilename}`,
      key: newFilename,
      method: 'POST', // Changed from PUT to POST for form-data upload
    });
  });

  // Delete file
  app.delete('/api/upload/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(UPLOAD_DIR, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: 'File deleted' });
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  });
}
