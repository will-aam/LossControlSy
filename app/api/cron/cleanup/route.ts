import { expireOldFiscalNotes } from "@/app/actions/cleanup";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Verificação de segurança (ex: Token no Header)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const result = await expireOldFiscalNotes();
  return NextResponse.json(result);
}
