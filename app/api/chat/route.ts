// app/api/chat/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

class PipelineSingleton {
  static task = 'feature-extraction' as const;
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance: any = null;

  static async getInstance() {
    if (this.instance === null) {
      const { pipeline } = await import('@xenova/transformers');
      this.instance = await pipeline(this.task, this.model);
    }
    return this.instance;
  }
}

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid message" },
        { status: 400 }
      );
    }

    const embedder = await PipelineSingleton.getInstance();
    
    // Improved query embedding accuracy with instructional prefix
    const queryInput = "Represent this query for retrieving relevant product information: " + message;
    const output = await embedder(queryInput, { pooling: "mean", normalize: true });
    
    // @ts-ignore
    const queryEmbedding = Array.from(output.data);

    // Filter noise with tight match_count
    const { data: rawMatches, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_count: 3, 
      filter: {},
    });

    if (error) {
      console.error("Supabase match_documents error:", error);
      return NextResponse.json({
        answer: `System Error: Database mismatch or query failed. Check terminal logs. Error: ${error.message}`,
        sourceChunks: [],
      });
    }

    console.log(rawMatches, "matches");

    // Strict threshold logic
    const THRESHOLD = 0.15;
    const matches = (rawMatches || []).filter((d: any) => d.similarity > THRESHOLD);

    if (matches.length === 0) {
      const generic = `❌ I couldn't find this in the product data.`;
      return NextResponse.json({
        answer: generic,
        sourceChunks: [],
      });
    }

    const contextText = matches
      .map((m: any) => m.content)
      .join("\n\n---\n\n");

    const systemPrompt = `
      You are a professional assistant for the brand "Natural Baby".
      Answer concisely using only the provided context.
      Do not add suggestions or extra commentary.
      If unsure, say: "I couldn't find this in the document."
    `.trim();

    const userPrompt = `
      Context from our product knowledge base (Ordered from Primary Match to Secondary Matches):
      ${contextText}

      User question: ${message}

      Answer concisely. Derive your answer primarily from the topmost context match if applicable. 
      End your response with a very short italicized sentence explaining why you chose this answer based on the context.
    `.trim();

    // Generate accurate answer with Gemini based entirely on fetched DB context vectors
    const chatModel = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt 
    });

    const completion = await chatModel.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.4 }
    });

    const answer = completion.response.text() ?? "Sorry, I couldn't generate a response.";

    return NextResponse.json({
      answer,
      sourceChunks: matches,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
