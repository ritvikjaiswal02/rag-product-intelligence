// scripts/embed.ts
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! 
);

async function embed() {
  console.log("🚀 Embed function started");
  const filePath = path.join(process.cwd(), "data", "natural-baby.txt");
  const rawText = fs.readFileSync(filePath, "utf-8");

  // Increased chunk quality via size & overlap as recommended
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 120,
  });

  const chunks = await splitter.splitText(rawText);

  console.log(`🔹 Total chunks created: ${chunks.length}`);

  const { pipeline } = await import("@xenova/transformers");
  const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

  for (const chunk of chunks) {
    const output = await embedder(chunk, {
      pooling: "mean",
      normalize: true,
    });

    const embedding = Array.from(output.data);

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