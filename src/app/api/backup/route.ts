import { auth } from "@/lib/auth";
import { exportBackupJson } from "@/lib/services/backup";
import { localISODate } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const json = await exportBackupJson();
  return new Response(json, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="patrimonio-${localISODate()}.json"`,
    },
  });
}
