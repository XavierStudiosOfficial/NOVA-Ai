
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    message: { error: "Too many requests. Please try again later." }
  })
);

// NOVA AI status
app.get("/", (req, res) => {
  res.json({
    name: "NOVA AI",
    fullName: "Networked Operator for Virtual Assistance",
    status: "ONLINE",
    version: "0.2.0"
  });
});

// NOVA AI chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OpenAI API key is missing from the server."
      });
    }

    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Please provide a message."
      });
    }

    if (message.length > 12000) {
      return res.status(400).json({
        error: "Message is too long."
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-6-luna",
          instructions:
            "You are NOVA AI, short for Networked Operator for Virtual Assistance. You are a friendly, capable AI coding assistant. Help users understand code, debug errors, and build software. Explain technical concepts clearly.",
          input: message,
          max_output_tokens: 1200
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);

      return res.status(response.status).json({
        error: data.error?.message || "OpenAI API request failed."
      });
    }

    const answer = (data.output || [])
      .filter(item => item.type === "message")
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n");

    res.json({
      reply: answer || "NOVA received an empty response."
    });

  } catch (error) {
    console.error("Server error:", error);

    res.status(500).json({
      error: "NOVA AI encountered a server error."
    });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log("================================");
  console.log("       NOVA AI BACKEND");
  console.log("================================");
  console.log("Status: ONLINE");
  console.log(`Address: http://127.0.0.1:${PORT}`);
});
