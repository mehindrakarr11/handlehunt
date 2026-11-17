import { failure, success } from "@/lib/api";
import { usernameSchema } from "@/lib/validation";
import { ManualOnlyProvider } from "@/lib/verification/provider";
export async function GET(request: Request) {
  try {
    return success(
      await new ManualOnlyProvider().check(
        usernameSchema.parse(new URL(request.url).searchParams.get("username")),
      ),
    );
  } catch (error) {
    return failure(error);
  }
}
