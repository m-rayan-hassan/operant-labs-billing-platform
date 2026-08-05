import express from 'express';
import { stripeWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

// We need raw body for stripe webhook to verify signature
router.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

export default router;
