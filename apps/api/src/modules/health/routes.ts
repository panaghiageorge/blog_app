import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", {
    schema: { tags: ["Health"], summary: "Check API health" },
  }, async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  });
};
