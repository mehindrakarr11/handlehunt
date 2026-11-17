import {
  ApiError,
  failure,
  jsonBody,
  requireAccount,
  sameOrigin,
  success,
} from "@/lib/api";
import { generateCandidates, validateOptions } from "@/lib/handle-generator";
import { generationSchema } from "@/lib/validation";
import { supabaseConfigured } from "@/lib/supabase/config";
import { demoLimit } from "@/lib/demo-limit";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    let account: Awaited<ReturnType<typeof requireAccount>> | null = null;
    if (supabaseConfigured()) {
      account = await requireAccount();
    } else if (!demoLimit("generation"))
      throw new ApiError(
        429,
        "Demo generation limit reached. Try again in a minute.",
      );
    const raw = generationSchema.parse(await jsonBody(request));
    let options;
    try {
      options = validateOptions(raw);
    } catch (error) {
      throw new ApiError(
        400,
        error instanceof Error ? error.message : "Invalid filters",
      );
    }
    const candidates = generateCandidates(options);
    let batchId: string | null = null;
    if (account) {
      const { data, error } = await account.client
        .from("generated_batches")
        .insert({
          user_id: account.user.id,
          options,
          candidate_count: candidates.length,
        })
        .select("id")
        .single();
      if (error) throw error;
      batchId = data.id;
    }
    return success({
      candidates,
      count: candidates.length,
      batchId,
      availability: "UNVERIFIED",
      mode: account ? "cloud" : "demo",
      notice: "No Instagram availability lookup was performed.",
    });
  } catch (error) {
    return failure(error);
  }
}
