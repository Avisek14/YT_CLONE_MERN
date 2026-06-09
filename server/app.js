import express from "express"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config()

// Import database connection
import connectDB from "./config/db.js"

// Import routes
import authRoutes from "./routes/authRoutes.js"
import videoRoutes from "./routes/videoRoutes.js"
import channelRoutes from "./routes/channelRoutes.js"
import commentRoutes from "./routes/commentRoutes.js"

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing in environment variables")
}

// Initialize Express app
const app = express()

// ==================== DATABASE ====================
connectDB().catch((error) => {
    console.error("Failed to connect to database:", error)
    process.exit(1)
})

// ==================== MIDDLEWARE ====================

// CORS Configuration
const corsOptions = {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    optionsSuccessStatus: 200,
}
app.use(cors(corsOptions))

// Body Parser
app.use((req, res, next) => {
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
        if (
            !req.headers["content-length"] ||
            parseInt(req.headers["content-length"]) === 0
        ) {
            req.body = {}
            return next()
        }
    }
    next()
})

app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ limit: "10mb", extended: true }))

// Request Logging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${req.method} ${req.path}`)
    next()
})

// ==================== HEALTH CHECK ====================
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
    })
})

// ==================== API ROUTES ====================
app.use("/api/auth", authRoutes)
app.use("/api/videos", videoRoutes)
app.use("/api/channels", channelRoutes)
app.use("/api/comments", commentRoutes)

// ==================== 404 HANDLER ====================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
        path: req.path,
        method: req.method,
    })
})

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
    console.error("Error:", err.message)

    const statusCode = err.status || err.statusCode || 500

    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal server error",
    })
})

// ==================== SERVER STARTUP ====================
const PORT = process.env.PORT || 5000

const server = app.listen(PORT, () => {
    console.log("\n" + "=".repeat(50))
    console.log("🚀 SERVER STARTED")
    console.log("=".repeat(50))
    console.log(`🌐 URL: http://localhost:${PORT}`)
    console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`)
    console.log(`⏰ Started: ${new Date().toISOString()}`)
    console.log("=".repeat(50) + "\n")
})

// ==================== GRACEFUL SHUTDOWN ====================
process.on("SIGTERM", () => {
    server.close(() => {
        console.log("Server closed")
        process.exit(0)
    })
})

process.on("SIGINT", () => {
    server.close(() => {
        console.log("Server closed")
        process.exit(0)
    })
})

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection:", reason)
})

process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error)
    process.exit(1)
})