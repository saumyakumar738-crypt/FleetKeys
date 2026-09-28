import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { SupabaseApiError } from "./lib/supabase";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use(
  (
    error: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    if (error instanceof Error && error.name === "MissingFleetUser") {
      res.status(401).json({ error: error.message });
      return;
    }

    if (error instanceof SupabaseApiError) {
      logger.error(
        { status: error.status, body: error.body },
        "Supabase request failed",
      );
      const schemaMissing =
        error.status === 404 &&
        typeof error.body === "object" &&
        error.body !== null &&
        "code" in error.body &&
        error.body.code === "PGRST205";
      res.status(schemaMissing ? 503 : 502).json({
        error: schemaMissing
          ? "Fleet schema is not installed in Supabase. Apply supabase/migrations/001_fleet_key_control.sql."
          : "Supabase request failed.",
      });
      return;
    }

    logger.error({ err: error }, "Unhandled API error");
    res.status(500).json({ error: "Internal server error." });
  },
);

export default app;
