import { schema } from "@/prisma/generated/zero/schema";
import { syncedQueryWithContext, createBuilder } from "@rocicorp/zero";
import { z } from "zod";

export type QueryContext = {
  userID: string;
};

const builder = createBuilder(schema);

export const getUsers = syncedQueryWithContext(
  "getUsers",
  z.tuple([]),
  (ctx: QueryContext) => {
    return builder.users;
  }
);

export const getCallParticipants = syncedQueryWithContext(
  "getCallParticipants",
  z.tuple([z.string()]),
  (ctx: QueryContext, callId: string) => {
    return builder.call_participants.where("callId", callId).related("user");
  }
);

export const getCalls = syncedQueryWithContext(
  "getCalls",
  z.tuple([]),
  (ctx: QueryContext) => {
    return builder.calls.whereExists("participants", (p) =>
      p.where("userId", ctx.userID)
    );
  }
);
