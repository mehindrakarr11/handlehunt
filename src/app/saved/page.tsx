import type { Metadata } from "next";
import { SavedPage } from "@/components/saved-page";
export const metadata: Metadata = { title: "Saved handles" };
export default function Page() {
  return <SavedPage />;
}
