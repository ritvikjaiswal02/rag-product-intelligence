import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import path from "path";
import fs from "fs";

config({ path: path.resolve(process.cwd(), ".env.local") });

async function test() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { pipeline } = await import("@xenova/transformers");
    const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    const output = await embedder("which product sells most", { pooling: "mean", normalize: true });
    // @ts-ignore
    const queryEmbedding = Array.from(output.data);

    const { data: matches, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_count: 5,
      filter: {},
    });

    fs.writeFileSync("query-result.json", JSON.stringify({ matches, error }, null, 2));
  } catch (err) {
    fs.writeFileSync("query-result.json", JSON.stringify({ exception: String(err) }, null, 2));
  }
}

test();
