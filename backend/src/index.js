import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import hpp from "hpp";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.routes.js";
import clientRouter from "./routes/client.routes.js";
import invoiceRouter from "./routes/invoice.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import userRouter from "./routes/user.routes.js";
import webhookRouter from "./routes/webhook.routes.js";


const app = express();

const PORT = process.env.PORT || 8080;

app.use(cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      process.env.APP_URL,
    ].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "device-remember-token",
      "Access-Control-Allow-Origin",
      "Origin",
      "Accept",
    ],
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 500,
  message: "Too many requests from this IP, please try again later.",
});

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(hpp());

app.use("/api", limiter);

// Mount webhooks before express.json() to allow raw body parsing for Stripe
app.use("/api/webhooks", webhookRouter);

app.use(express.json({ limit: "10kb" })); // Body limit is 10kb
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());


if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

app.get("/health", (req, res) => {
    res.status(200).json({
        message: "Server is running",
        success: true,
    });
});

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use("/api/auth", authRouter);
app.use("/api/clients", clientRouter);
app.use("/api/invoices", invoiceRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/users", userRouter);

// 404 Handler — must have exactly 4 params to not be treated as an error handler
app.use((_req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  // Zod validation errors → 400
  if (err.name === "ZodError") {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: err.errors,
    });
  }

  console.error(err);
  return res.status(500).json({
    status: "error",
    message: "Something went wrong",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});


app.listen(PORT, () => {
    console.log("Server is running on port", PORT);
});
