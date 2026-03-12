import express from "express";
import dotenv from "dotenv";

import { connectDb } from "./database/connectDB.js";
import authRoutes from "./routes/auth.route.js";

dotenv.config(); // Load environment variables from .env file

const app = express(); // Create an instance of the Express application
const PORT = process.env.PORT || 5000;

app.use(express.json()); // Middleware to parse JSON bodies

app.use("/api/auth", authRoutes); // Use the auth routes for any requests to /api/auth

// Basic route to check if the server is running
app.get("/", (req, res) => {
  res.send("Welcome to the MernAuth API, everything is working fine!");
});

// Start the server and connect to the database
app.listen(PORT, () => {
  connectDb();
  console.log("Server is running on port: ", PORT);
});
