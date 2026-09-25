import { GoogleGenAI } from "@google/genai";

const schema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          id: {
            type: "string"
          },
          subject: {
            type: "string"
          },
          topic: {
            type: "string"
          },
          level: {
            type: "string",
            enum: ["B1"]
          },
          question: {
            type: "string"
          },
          options: {
            type: "array",
            minItems: 5,
            maxItems: 5,
            items: {
              type: "string"
            }
          },
          correct: {
            type: "integer",
            minimum: 0,
            maximum: 4
          },
          tip: {
            type: "string"
          }
        },
        required: [
          "id",
          "subject",
          "topic",
          "level",
          "question",
          "options",
          "correct",
          "tip"
        ],
        additionalProperties: false
      }
    }
  },
  required: ["questions"],
  additionalProperties: false
};

export default async function handler(req, res) {
  // Set CORS headers for local testing and flexibility
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  // Parse request body if necessary
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON in request body." });
    }
  } else if (!body && req.on) {
    try {
      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }
      const raw = Buffer.concat(buffers).toString("utf8");
      if (raw) {
        body = JSON.parse(raw);
      }
    } catch {
      return res.status(400).json({ error: "Invalid JSON in request body." });
    }
  }

  const { subject = "Grammatik", topic } = body || {};

  if (!topic || typeof topic !== "string" || !topic.trim()) {
    return res.status(400).json({
      error: "Parameter 'topic' is required and must be a non-empty string."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server configuration error: GEMINI_API_KEY is not set."
    });
  }

  const sanitizedTopic = topic.trim();
  const sanitizedSubject = typeof subject === "string" ? subject.trim() : "Grammatik";

  const prompt = `
You are a German teacher specializing in CEFR B1 exam preparation.

Generate exactly 5 German B1 multiple-choice questions.

Subject: ${sanitizedSubject}
Topic: ${sanitizedTopic}

Requirements:
- Every question must test ${sanitizedTopic} (${sanitizedSubject}).
- Each question must have exactly 5 options.
- Exactly one option must be correct.
- The correct answer must be represented by its zero-based index (0 to 4).
- Vary the position of the correct answer across the 5 questions.
- Make all options plausible for a B1 learner.
- Avoid ambiguous questions.
- Use natural, authentic German.
- Write the tips in clear, simple German explaining why the correct answer is right.
- Give every question a unique ID.

Return only the requested JSON structure.
`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const text = response.text;
    if (!text) {
      return res.status(500).json({ error: "Gemini returned an empty response." });
    }

    const data = JSON.parse(text);

    if (!data.questions || !Array.isArray(data.questions) || data.questions.length !== 5) {
      return res.status(500).json({ error: "Received malformed question set from model." });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Gemini API error:", err);
    return res.status(500).json({
      error: "Failed to generate questions from Gemini: " + (err.message || String(err))
    });
  }
}
