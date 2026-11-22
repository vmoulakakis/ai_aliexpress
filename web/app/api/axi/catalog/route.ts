import { NextRequest, NextResponse } from "next/server";
import { getAxiData } from "../../../../lib/axi";
import { PROBLEMS } from "../../../../lib/axi-shared";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if ([...p.keys()].some((k) => !["problem", "limit", "after"].includes(k)))
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  const problem = p.get("problem"),
    limit = Number(p.get("limit") || 3),
    after = p.get("after");
  if (
    (problem !== null && !Object.hasOwn(PROBLEMS, problem)) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 12 ||
    (after !== null && !/^\d{1,12}$/.test(after))
  )
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  const q = new URLSearchParams({ limit: String(limit) });
  if (problem) q.set("problem", problem);
  if (after) q.set("after", after);
  try {
    const data = await getAxiData(q.toString());
    return NextResponse.json(
      { source: data.source, items: data.items },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "source_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
