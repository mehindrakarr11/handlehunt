import {
  failure,
  jsonBody,
  requireAccount,
  sameOrigin,
  success,
} from "@/lib/api";
import { candidateSchema, paginationSchema } from "@/lib/validation";
export async function GET(request: Request) {
  try {
    const { client, user } = await requireAccount();
    const { page, limit, search, exact } = paginationSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    let query = client
      .from("saved_handles")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (search && exact === "1")
      query = query.eq("username", search.toLowerCase());
    else if (search)
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
    const { client, user } = await requireAccount();
    const c = candidateSchema.parse(await jsonBody(request));
    const { data, error } = await client
      .from("saved_handles")
      .upsert(
        { user_id: user.id, username: c.username, candidate: c },
        { onConflict: "user_id,username" },
      )
      .select()
      .single();
    if (error) throw error;
    return success(data, 201);
  } catch (error) {
    return failure(error);
  }
}
