import { authenticate } from "./auth";

export function adminOnly(req: Request) {
  const decoded: any = authenticate(req);

  if (decoded.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  return decoded;
}
