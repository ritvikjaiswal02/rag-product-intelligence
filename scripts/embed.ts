import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { config } from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! 
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function embed() {
  console.log("🚀 Embed function started");
  const filePath = path.join(process.cwd(), "data", "natural-baby.txt");
  const rawText = fs.readFileSync(filePath, "utf-8");

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 120,
  });

  const chunks = await splitter.splitText(rawText);

  console.log(`🔹 Total chunks created: ${chunks.length}`);

  const embedModel = genAI.getGenerativeModel({
    model: "gemini-embedding-001",
  });

  for (const chunk of chunks) {
    const embeddingRes = await embedModel.embedContent(chunk);

    const embedding = embeddingRes.embedding.values;

    const { error } = await supabase.from("documents").insert({
      content: chunk,
      metadata: { brand: "Natural Baby" },
      embedding,
    });

    if (error) {
      console.error("❌ Error inserting chunk:", error);
    } else {
      console.log("✅ Inserted chunk:", chunk.substring(0, 50));
    }
  }

  console.log("🎉 Embedding completed successfully!");
}
embed();