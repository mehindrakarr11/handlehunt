import { z } from "zod";
import { failure, requireAccount, sameOrigin, success } from "@/lib/api";
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const { client, user } = await requireAccount();
    const id = z.uuid().parse((await params).id);
    const { error } = await client
      .from("saved_handles")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) throw error;
    return success({ deleted: true });
  } catch (error) {
    return failure(error);
  }
}
