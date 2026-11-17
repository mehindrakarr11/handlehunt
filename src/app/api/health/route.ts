import { success } from "@/lib/api";
import { supabaseConfigured } from "@/lib/supabase/config";
export function GET() {
  return success({
    service: "HandleHunt",
    mode: supabaseConfigured() ? "cloud" : "demo",
    discovery: true,
    automatedInstagramChecks: false,
    verification: "manual",
    databaseConnectivity: "not_probed",
  });
}
