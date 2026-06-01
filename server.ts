import express from 'express';
import cors from 'cors';
import path from 'path';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import apiRoutes from './server/api';
import { initDb, pool } from './server/db';

// Server starting...

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(compression());
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request logger for debugging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.method === 'POST') console.log('Body:', JSON.stringify(req.body));
    next();
  });

  // API Routes
  app.use('/api', apiRoutes);

  // Swagger Documentation Setup
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'BetoBook API Docs',
        version: '1.0.0',
        description: 'Tài liệu hướng dẫn sử dụng và thử nghiệm API cho dự án BetoBook',
      },
      servers: [
        {
          url: `http://localhost:${PORT}`,
          description: 'Development Server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    apis: [
      './server/routes/*.ts',
      './server/api.ts'
    ],
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Detailed Health check
  app.get('/api/health', async (req, res) => {
    try {
      // Simple query to check DB connection
      const [result] = await pool.query('SELECT 1 as connected');
      res.json({ 
        status: 'ok', 
        message: 'Server is running',
        db: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ 
        status: 'error', 
        db: 'disconnected', 
        message: err.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1d',
      etag: true
    }));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Initialize database AFTER server is listening
    initDb().then(() => {
      // Database connected
    }).catch(err => {
      console.error('Database initialization failed:', err);
    });
  });
}

startServer();
