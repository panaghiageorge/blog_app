import Fastify from "fastify";
import swagger from "@fastify/swagger";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import swaggerUi from "@fastify/swagger-ui";
import path from "node:path";
import { authRoutes } from "./modules/auth/routes.js";
import { categoryRoutes } from "./modules/categories/routes.js";
import { healthRoutes } from "./modules/health/routes.js";
import { languageRoutes } from "./modules/languages/routes.js";
import { legalRoutes } from "./modules/legal/routes.js";
import { newsletterRoutes } from "./modules/newsletter/routes.js";
import { postRoutes } from "./modules/posts/routes.js";
import { tagRoutes } from "./modules/tags/routes.js";
import { userRoutes } from "./modules/users/routes.js";
import { uploadRoutes } from "./modules/uploads.routes.js";
import { dbPlugin } from "./plugins/db.js";
import { securityPlugin } from "./plugins/security.js";

export const buildApp = () => {
  const app = Fastify({
    logger: true,
  });

  app.register(swagger, {
    openapi: {
      info: {
        title: "Blog API",
        description: "API pentru autentificare, utilizatori, limbi și postări.",
        version: "1.0.0",
      },
      tags: [
        { name: "Health", description: "Starea serviciului" },
        { name: "Auth", description: "Autentificare și utilizatorul curent" },
        { name: "Languages", description: "Limbile active ale blogului" },
        { name: "Categories", description: "Categoriile active ale blogului" },
        { name: "Users", description: "Administrarea utilizatorilor" },
        { name: "Posts", description: "Administrarea postărilor" },
        { name: "Tags", description: "Tagurile blogului" },
        { name: "Legal", description: "Pagini legale și politici" },
        { name: "Newsletter", description: "Abonări newsletter" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Introdu doar tokenul JWT, fără prefixul Bearer.",
          },
        },
      },
    },
  });
  app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });

  app.register(securityPlugin);
  app.register(multipart);
  app.register(fastifyStatic, {
    root: path.resolve(process.cwd(), "uploads"),
    prefix: "/uploads/",
    decorateReply: false,
  });
  app.register(dbPlugin);
  app.register(healthRoutes, { prefix: "/api" });
  app.register(authRoutes, { prefix: "/api/auth" });
  app.register(languageRoutes, { prefix: "/api/languages" });
  app.register(legalRoutes, { prefix: "/api/legal" });
  app.register(newsletterRoutes, { prefix: "/api/newsletter" });
  app.register(categoryRoutes, { prefix: "/api/categories" });
  app.register(userRoutes, { prefix: "/api/users" });
  app.register(postRoutes, { prefix: "/api/posts" });
  app.register(tagRoutes, { prefix: "/api/tags" });
  app.register(uploadRoutes, { prefix: "/api/uploads" });

  return app;
};

