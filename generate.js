import { GoogleGenAI } from "@google/genai";
import fs from "node:fs/promises";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

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
            type: "string",
            enum: ["grammar"]
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

const prompt = `
You are a German teacher specializing in CEFR B1 exam preparation.

Generate exactly 5 German B1 multiple-choice questions.

Subject: grammar
Topic: Konjunktiv II

Requirements:
- Every question must test Konjunktiv II.
- Each question must have exactly 5 options.
- Exactly one option must be correct.
- The correct answer must be represented by its zero-based index.
- Vary the position of the correct answer.
- Make all options plausible for a B1 learner.
- Avoid ambiguous questions.
- Use natural German.
- Write the tips in simple German.
- Give every question a unique ID.

Return only the requested JSON structure.
`;

async function main() {
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
    throw new Error("Gemini returned an empty response.");
  }

  const data = JSON.parse(text);

  await fs.writeFile(
    "questions.json",
    JSON.stringify(data, null, 2),
    "utf8"
  );

  console.log("Generated questions.json successfully.");
}

main().catch(error => {
  console.error("Generation failed:", error.message);
  process.exit(1);
});
