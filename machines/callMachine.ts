import { createMachine, createActor } from "xstate";

interface CallContext {
  call_id?: string;
}

type CallEvent = { type: "CONNECT"; call_id?: string } | { type: "DISCONNECT" };

export type CallState = "idle" | "on_call";

export const callMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAbdBZVyAWAlgHZgB0BE6YAxAMIDyAcowKK0AqA2gAwC6ioAA4B7WAQAuBYUQEgAHogCMAZm6kAnIu4BWABwB2AEzd1x-eoBsAGhABPJfoulDF7dvUAWQ7t3ddFlQBfQJs0TBx8YjJpAH0w9GoAEQBJAGUGZjYuPlkRMUlpWQUERX1lUj8jZV1FD2Vai2s7RBrSRRrdbQ927Ud1HWCQkCJhCDhZeIjCElzRCSkZJHlEAFom+wQV7Q11Xb39veVg0IxsXGmyCipZ-IWixC8bDa11Um0Aw21lfV6LD3-9McQJNzlFSLF4jd5oUlsVlPDnMoXIZlBZ9DoXNonkpFIYKh8vj9HP8PIDBkA */
    id: "callMachine",
    initial: "idle",
    types: {
      context: {} as CallContext,
      events: {} as CallEvent,
    },
    context: {
      call_id: undefined,
    },
    states: {
      idle: {
        on: {
          CONNECT: {
            target: "on_call",
            guard: ({ context, event }) => {
              const callId = event.call_id || context.call_id;
              return !!callId;
            },
            actions: {
              type: "assignCallId",
            },
          },
        },
      },
      on_call: {
        on: {
          DISCONNECT: {
            target: "idle",
            actions: {
              type: "clearCallId",
            },
          },
        },
      },
    },
  },
  {
    actions: {
      assignCallId: ({ context, event }) => {
        if (event.type === "CONNECT" && event.call_id) {
          context.call_id = event.call_id;
        }
      },
      clearCallId: ({ context }) => {
        context.call_id = undefined;
      },
    },
  }
);

export const callActor = createActor(callMachine).start();
