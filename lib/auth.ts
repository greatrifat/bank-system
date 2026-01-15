import { verifyToken } from "./jwt";

export function authenticate(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];

  try {
    return verifyToken(token); // if valid, returns payload
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      // token expired
      return null;
    }
    throw new Error("Unauthorized");
  }
}
