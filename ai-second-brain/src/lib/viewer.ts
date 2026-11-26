import { requireIdentity } from "../../cursor/identity";

export type AppViewer = {
  sub: string;
  name: string;
  email: string;
  stage: "production" | "preview";
};

export async function requireViewer(
  request: Request,
): Promise<AppViewer | Response> {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;
  return {
    sub: identity.sub,
    name: identity.name || "You",
    email: identity.email || "",
    stage: identity.stage === "preview" ? "preview" : "production",
  };
}
