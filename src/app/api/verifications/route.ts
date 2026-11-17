import {
  ApiError,
  failure,
  jsonBody,
  requireAccount,
  sameOrigin,
  success,
} from "@/lib/api";
import { paginationSchema, verificationSchema } from "@/lib/validation";
export async function GET(request: Request) {
  try {
    const { client, user } = await requireAccount();
    const { page, limit, search } = paginationSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    let query = client
      .from(
        new URL(request.url).searchParams.get("current") === "1"
          ? "handle_verifications"
          : "verification_events",
      )
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order(
        new URL(request.url).searchParams.get("current") === "1"
          ? "checked_at"
          : "created_at",
        { ascending: false },
      )
      .order("id")
      .range((page - 1) * limit, page * limit - 1);
    if (search)
      query = query.like(
        "username",
        `%${search.toLowerCase().replace(/_/g, "\\_")}%`,
      );
    const { data, error, count } = await query;
    if (error) throw error;
    return success({ items: data, total: count, page, limit });
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { client } = await requireAccount();
    const v = verificationSchema.parse(await jsonBody(request));
    const { data, error } = await client.rpc("record_verification", {
      p_username: v.username,
      p_status: v.status,
      p_note: v.note,
      p_method: v.method,
    });
    if (error) {
      if (error.code === "PGRST202")
        throw new ApiError(
          503,
          "Profile review storage needs the latest database migration. Apply 202611180001_profile_reviews.sql.",
        );
      if (error.message.includes("transition"))
        return failure(
          new ApiError(
            409,
            "Mark a claimed handle as Needs recheck before recording a different result.",
          ),
        );
      throw error;
    }
    return success(data, 201);
  } catch (error) {
    return failure(error);
  }
}
