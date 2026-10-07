import { productSvg } from "@/mocks/svg";

export async function GET(req: Request, ctx: { params: Promise<{ kind: string; color: string }> }) {
  const { kind, color } = await ctx.params;
  const view = Number(new URL(req.url).searchParams.get("v") ?? 0) || 0;
  return new Response(productSvg(kind, color.replace(/\.svg$/, ""), view), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
