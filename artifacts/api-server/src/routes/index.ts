import { Router, type IRouter } from "express";
import healthRouter from "./health";
import fleetRouter from "./fleet";

const router: IRouter = Router();

router.use(healthRouter);
router.use(fleetRouter);

export default router;
