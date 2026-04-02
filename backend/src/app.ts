import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import config from './config.js';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

const app = express();

app.use(helmet());
app.use(compression());
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  })
);
app.use(
  cors({
    // Dev: allow any origin (ngrok, localhost.run, LAN IPs, etc.)
    // Prod: restrict to the explicit CORS_ORIGINS list in .env
    origin: config.isProd ? config.corsOrigins : true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan(config.isProd ? 'combined' : 'dev'));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);
app.use(errorHandler);

export default app;
