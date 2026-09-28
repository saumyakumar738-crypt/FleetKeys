import { Router, type IRouter, type Request, type Response } from "express";
import {
  AllotFleetDriverKeyBody,
  AllotFleetDriverKeyResponse,
  CreateFleetTransferBody,
  CreateFleetTransferResponse,
  GetFleetSummaryResponse,
  IssueFleetPenaltyBody,
  IssueFleetPenaltyResponse,
  ListFleetDriverKeysResponse,
  ListFleetKeysResponse,
  ListFleetLeaderboardResponse,
  ListFleetPenaltiesResponse,
  ListFleetTransfersResponse,
  AcceptFleetTransferResponse,
  CancelFleetTransferResponse,
  RejectFleetTransferResponse,
  RevertFleetPenaltyResponse,
} from "@workspace/api-zod";
import { callRpc, selectRows } from "../lib/supabase";

const router: IRouter = Router();
type Row = Record<string, unknown>;

function actorId(req: Request): string | null {
  const value = req.header("X-Fleet-User-Id");
  return value?.trim() || null;
}

function requireActor(req: Request): string {
  const id = actorId(req);
  if (!id) {
    const error = new Error("X-Fleet-User-Id header is required.");
    error.name = "MissingFleetUser";
    throw error;
  }
  return id;
}

function rejectInvalidBody(
  res: Response,
  parsed: { success: boolean; error?: { message: string } },
): boolean {
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error?.message ?? "Invalid request." });
    return true;
  }
  return false;
}

function mapKey(row: Row) {
  return {
    id: row.id,
    vehicle: row.vehicle,
    keyId: row.key_id,
    department: row.department,
    custodianId: row.custodian_id,
    custodianName: row.custodian_name,
    receivedAt: row.received_at,
    jobCardStatus: row.job_card_status,
    vehicleStatus: row.vehicle_status,
    transferStatus: row.transfer_status,
    history: Array.isArray(row.history) ? row.history : [],
  };
}

function mapTransfer(row: Row) {
  return {
    id: row.id,
    keyIds: Array.isArray(row.key_ids) ? row.key_ids : [],
    recipientId: row.recipient_id,
    recipientName: row.recipient_name,
    vehicle: row.vehicle,
    senderId: row.sender_id,
    senderName: row.sender_name,
    purpose: row.purpose,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    kind: row.kind,
    status: row.status,
  };
}

function mapDriverKey(row: Row) {
  return {
    id: row.id,
    vehicle: row.vehicle,
    keyId: row.key_id,
    driverId: row.driver_id,
    driverName: row.driver_name,
    phone: row.phone,
    status: row.status,
    allottedAt: row.allotted_at ?? null,
  };
}

function mapPenalty(row: Row) {
  return {
    id: row.id,
    driverKeyId: row.driver_key_id,
    driverId: row.driver_id,
    driverName: row.driver_name,
    vehicle: row.vehicle,
    keyId: row.key_id,
    reason: row.reason,
    amount: Number(row.amount),
    issuedAt: row.issued_at,
    status: row.status,
    revertedAt: row.reverted_at ?? null,
  };
}

function mapLeaderboard(row: Row) {
  return {
    driverId: row.driver_id,
    driverName: row.driver_name,
    activePenalties: Number(row.active_penalties),
    score: Number(row.score),
    rank: Number(row.rank),
  };
}

router.get("/fleet/keys", async (req, res): Promise<void> => {
  const custodianId = requireActor(req);
  const rows = await selectRows<Row>("fleet_key_records", {
    custodian_id: `eq.${custodianId}`,
    order: "received_at.desc",
  });
  res.json(ListFleetKeysResponse.parse(rows.map(mapKey)));
});

router.get("/fleet/transfers", async (req, res): Promise<void> => {
  const userId = requireActor(req);
  const rows = await selectRows<Row>("fleet_transfer_records", {
    or: `(sender_id.eq.${userId},recipient_id.eq.${userId})`,
    order: "started_at.desc",
  });
  res.json(ListFleetTransfersResponse.parse(rows.map(mapTransfer)));
});

router.get("/fleet/driver-keys", async (req, res): Promise<void> => {
  requireActor(req);
  const rows = await selectRows<Row>("fleet_driver_key_records", {
    order: "id.asc",
  });
  res.json(ListFleetDriverKeysResponse.parse(rows.map(mapDriverKey)));
});

router.get("/fleet/penalties", async (req, res): Promise<void> => {
  const userId = requireActor(req);
  const rows = await selectRows<Row>("fleet_penalty_records", {
    driver_id: `eq.${userId}`,
    order: "issued_at.desc",
  });
  res.json(ListFleetPenaltiesResponse.parse(rows.map(mapPenalty)));
});

router.get("/fleet/leaderboard", async (req, res): Promise<void> => {
  requireActor(req);
  const rows = await selectRows<Row>("fleet_leaderboard", {
    order: "rank.asc",
  });
  res.json(ListFleetLeaderboardResponse.parse(rows.map(mapLeaderboard)));
});

router.get("/fleet/summary", async (req, res): Promise<void> => {
  const userId = requireActor(req);
  const [keys, transfers, penalties, leaderboard] = await Promise.all([
    selectRows<Row>("fleet_key_records", {
      custodian_id: `eq.${userId}`,
    }),
    selectRows<Row>("fleet_transfer_records", {
      recipient_id: `eq.${userId}`,
      status: "eq.pending",
    }),
    selectRows<Row>("fleet_penalty_records", {
      driver_id: `eq.${userId}`,
      status: "eq.active",
    }),
    selectRows<Row>("fleet_leaderboard", { order: "rank.asc" }),
  ]);
  const mappedKeys = keys.map(mapKey);
  const data = {
    myKeys: mappedKeys.filter((item) => item.transferStatus !== "missing").length,
    pendingTransfers: transfers.length,
    missingKeys: mappedKeys.filter((item) => item.transferStatus === "missing").length,
    activePenalties: penalties.length,
    leaderboard: leaderboard.map(mapLeaderboard),
  };
  res.json(GetFleetSummaryResponse.parse(data));
});

router.post("/fleet/transfers", async (req, res): Promise<void> => {
  const senderId = requireActor(req);
  const parsed = CreateFleetTransferBody.safeParse(req.body);
  if (!parsed.success) {
    rejectInvalidBody(res, parsed);
    return;
  }
  const transfer = await callRpc<unknown>("create_fleet_transfer", {
    p_sender_id: senderId,
    p_recipient_id: parsed.data.recipientId,
    p_key_ids: parsed.data.keyIds,
    p_purpose: parsed.data.purpose,
    p_kind: parsed.data.kind,
  });
  res.status(201).json(CreateFleetTransferResponse.parse(mapTransfer(transfer as Row)));
});

router.post("/fleet/transfers/:id/accept", async (req, res): Promise<void> => {
  const recipientId = requireActor(req);
  const transfer = await callRpc<unknown>("accept_fleet_transfer", {
    p_transfer_id: req.params.id,
    p_recipient_id: recipientId,
  });
  res.json(AcceptFleetTransferResponse.parse(mapTransfer(transfer as Row)));
});

router.post("/fleet/transfers/:id/reject", async (req, res): Promise<void> => {
  const recipientId = requireActor(req);
  const transfer = await callRpc<unknown>("reject_fleet_transfer", {
    p_transfer_id: req.params.id,
    p_recipient_id: recipientId,
  });
  res.json(RejectFleetTransferResponse.parse(mapTransfer(transfer as Row)));
});

router.post("/fleet/transfers/:id/cancel", async (req, res): Promise<void> => {
  const senderId = requireActor(req);
  const transfer = await callRpc<unknown>("cancel_fleet_transfer", {
    p_transfer_id: req.params.id,
    p_sender_id: senderId,
  });
  res.json(CancelFleetTransferResponse.parse(mapTransfer(transfer as Row)));
});

router.post("/fleet/driver-keys/:id/allot", async (req, res): Promise<void> => {
  const actor = requireActor(req);
  const parsed = AllotFleetDriverKeyBody.safeParse(req.body);
  if (!parsed.success) {
    rejectInvalidBody(res, parsed);
    return;
  }
  const driverKey = await callRpc<unknown>("allot_driver_key", {
    p_driver_key_id: req.params.id,
    p_driver_id: parsed.data.driverId,
    p_actor_id: actor,
  });
  res.json(AllotFleetDriverKeyResponse.parse(mapDriverKey(driverKey as Row)));
});

router.post("/fleet/penalties", async (req, res): Promise<void> => {
  const actor = requireActor(req);
  const parsed = IssueFleetPenaltyBody.safeParse(req.body);
  if (!parsed.success) {
    rejectInvalidBody(res, parsed);
    return;
  }
  const penalty = await callRpc<unknown>("issue_fleet_penalty", {
    p_driver_key_id: parsed.data.driverKeyId,
    p_reason: parsed.data.reason,
    p_amount: parsed.data.amount,
    p_actor_id: actor,
  });
  res.status(201).json(IssueFleetPenaltyResponse.parse(mapPenalty(penalty as Row)));
});

router.post("/fleet/penalties/:id/revert", async (req, res): Promise<void> => {
  const actor = requireActor(req);
  const penalty = await callRpc<unknown>("revert_fleet_penalty", {
    p_penalty_id: req.params.id,
    p_actor_id: actor,
  });
  res.json(RevertFleetPenaltyResponse.parse(mapPenalty(penalty as Row)));
});

export default router;