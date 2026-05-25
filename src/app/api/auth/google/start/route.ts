import { startGoogleSignIn } from "@/lib/auth/google-oauth";

export const runtime = "nodejs";

export async function GET() {
  await startGoogleSignIn();
}
