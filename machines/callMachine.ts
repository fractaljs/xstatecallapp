import { CallType } from "@/components/CallView";
import { createMachine, createActor, fromPromise, assign } from "xstate";

interface CallContext {
  call_id?: string;
  call?: CallType;
}

type CallEvent =
  | { type: "CALL"; call_id?: string; call?: CallType }
  | { type: "CONNECT" }
  | { type: "RING" }
  | { type: "ANSWER" }
  | { type: "DISCONNECT" }
  | { type: "REJECT" };

export type CallState =
  | "idle"
  | "initiating_call"
  | "failed_to_connect"
  | "calling"
  | "ringing"
  | "connected";

const dummyCall: CallType = {
  callId: "123",
  participants: [
    { name: "John Doe", id: "1", status: "online" },
    { name: "Jane Doe", id: "2", status: "offline" },
    { name: "Jim Doe", id: "3", status: "busy" },
  ],
};

export const callMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAbdBZVyAWAlgHZgB0BE6YAxAMIDyAcowKK0AqA2gAwC6ioAA4B7WAQAuBYUQEgAHogDsADkWkAbACYALAE4ArOoDM+3dvWKANCACeibYu2llm5et3d9m9eoCMhgF8A6zRMHHxiMmIJAlRJIigAfVD0aghpKKIAN2EAazIU8MISciIYuOIklIRiHLRJaR5eJtkRMQaZJHlEX39lZ3VlbW4-X2G9I2s7BG1h0k0jWeUx-V6jTX0gkIxsXGLM8viqneowACcz4TPSQXQ4gDMrgFtSQr3I0sPK5J2a7OF6lIiE0Wl02jFpLIFAgVGotHpDCYzBYpohNJpfKRVr4-PpuL4jOtfMojFsQG8IiUUpVqAAlACSjAA4qChKIIZ1QNDevp+m4hiNeuNdJNbD18aRfJ4jOp9EYCS5lPptGSKftXjsaQARekAZQYzDYXD4rXZHShPQ2ag82lURm42n0ih82lRCF5mKMym48tcvJtulVOyKHzOlRpAEFGLqAOosWmskDg81dbmKTGKXQ4rSKRS87je-RuknqUgeVyKbjcXRuAvKINhd4lMMJGm0lgAKSNieTQItCF86dImezmlz+cLbqd+mHNfTpjxTrHDd2lLILag2r1BtYHB7Zr7qZ6Q5HPjHee9k7FCAsmOlWdh2kJeZXIap0hIyHEkGoOv1TF3Y1+DBA9ISPd1vGHWUF10XQ-HWUVpmWJxiX8YkSwxGtXybMh7lQAgqAgRJxGEZIPzAL9f23ADuxNED2kPLlEC8UtnX0GC4IJBY3SfTQNHTIUazcDxNmCclgxw0g8IIyBiNI5ByMouRYHEOIyFQe5vzOAAKe0qwASmoNUPmkwi5LIohP3EfcGLApiINY6CDFg+DuOvRZuFIbQFkUDZVgE+sySIYQIDgWRjJIU1bM5boEAAWnUN04pnWDUrStKn2wtdyEoMAoo5ft3H6XQRw2e0RXRRLr1MfpBn8bxiUcUwsvVaJJAqBIfkwfKU3szj5g2YlYKfBwxh4r15gLJ8lTlTxPBaj5qQSHrGNisZNE83oBQWf0nR4vwNAJL1lT8XR0UUBbm3DZb6IK8DvOLHQsUHR1zC9KUSUugpFO-CAVrs2KTDUKVtDGPRNCzIZXWvEk1BGXiPEUeVPEDMSItw-CzJIiyrP+mLoXWXRSCrVYzrrWChiq6ZZicOqvBrYxuBUdQgiCIA */
    id: "callMachine",
    initial: "idle",
    types: {
      context: {} as CallContext,
      events: {} as CallEvent,
    },
    context: {
      call_id: undefined,
      call: undefined,
    },
    states: {
      idle: {
        on: {
          CONNECT: {
            target: "initiating_call",
          },
        },
      },
      initiating_call: {
        invoke: {
          src: "fetchCallId",
          onDone: {
            target: "calling",
            actions: {
              type: "assignCallDataFromQuery",
            },
          },
          onError: {
            target: "failed_to_connect",
          },
        },
      },
      calling: {
        on: {
          RING: {
            target: "ringing",
            guard: "hasOnlineParticipants",
          },
          DISCONNECT: {
            target: "idle",
            actions: {
              type: "clearCallId",
            },
          },
        },
      },
      ringing: {
        on: {
          ANSWER: {
            target: "connected",
          },
          REJECT: {
            target: "idle",
            actions: {
              type: "clearCallId",
            },
          },
          DISCONNECT: {
            target: "idle",
            actions: {
              type: "clearCallId",
            },
          },
        },
      },
      connected: {
        on: {
          DISCONNECT: {
            target: "idle",
            actions: {
              type: "clearCallId",
            },
          },
        },
      },
      failed_to_connect: {
        after: {
          3000: {
            target: "idle",
            actions: {
              type: "clearCallId",
            },
          },
        },
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
    guards: {
      hasOnlineParticipants: ({ context }) => {
        if (!context.call?.participants) {
          return false;
        }
        return context.call.participants.some(
          (participant) => participant.status === "online"
        );
      },
    },
    actors: {
      fetchCallId: fromPromise(async () => {
        // Simulating an async query with random success/failure
        return new Promise<{ call_id: string; call: CallType }>(
          (resolve, reject) => {
            setTimeout(() => {
              // 70% success rate, 30% failure rate
              if (Math.random() > 0.3) {
                resolve({
                  call_id: "123",
                  call: dummyCall,
                });
              } else {
                reject(new Error("Failed to generate call ID"));
              }
            }, 1000);
          }
        );
      }),
    },
    actions: {
      assignCallId: ({ context, event }) => {
        if (event.type === "CALL") {
          if (event.call_id) {
            context.call_id = event.call_id;
          }
          if (event.call) {
            context.call = event.call;
          }
        }
      },
      assignCallDataFromQuery: assign({
        call_id: ({ event }: { event: any }) => event.output.call_id,
        call: ({ event }: { event: any }) => event.output.call,
      }),
      clearCallId: ({ context }) => {
        context.call_id = undefined;
        context.call = undefined;
      },
    },
  }
);

export const callActor = createActor(callMachine).start();
