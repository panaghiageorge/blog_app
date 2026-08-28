import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string; role: "admin" | "author" };
    user: { sub: string; email: string; role: "admin" | "author" };
  }
}
