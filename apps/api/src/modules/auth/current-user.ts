import type { FastifyRequest } from "fastify";

export const getCurrentUserId = (request: FastifyRequest): number | null => {
  const sub = request.user?.sub;
  if (typeof sub !== "string" && typeof sub !== "number") {
    return null;
  }

  const userId = Number(sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
};
