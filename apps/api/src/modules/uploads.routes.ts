import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";

const allowedMimeTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/images",
    {
      preHandler: [app.authenticate, app.authorize("upload_images")],
      config: { rateLimit: { max: 20, timeWindow: "15 minutes" } },
    },
    async (request, reply) => {
      const file = await request.file({
        limits: { fileSize: 3 * 1024 * 1024 },
      });

      if (!file) {
        return reply.code(400).send({ message: "Missing image file" });
      }

      const extension = allowedMimeTypes.get(file.mimetype);
      if (!extension) {
        return reply.code(400).send({ message: "Only JPG, PNG, WEBP or GIF images are allowed" });
      }

      const uploadsDir = path.resolve(process.cwd(), "uploads", "images");
      await mkdir(uploadsDir, { recursive: true });

      const filename = `${Date.now()}-${randomUUID()}.${extension}`;
      const filePath = path.join(uploadsDir, filename);
      await writeFile(filePath, await file.toBuffer());

      return reply.code(201).send({
        url: `/uploads/images/${filename}`,
        filename,
        mimetype: file.mimetype,
      });
    },
  );
};