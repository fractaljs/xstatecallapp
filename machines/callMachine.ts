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
    /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAbdBZVyAWAlgHZgB0BE6YAxAMIDyAcowKK0AqA2gAwC6ioAA4B7WAQAuBYUQEgAHogCM3AMwBOUgCZFANhUAONUYAsa-SoDsAGhABPRBbUBWUis37F2408UHjmgF8AmzRMHHxiMmIJAlRJIigAfVD0aghpKKIAN2EAazIU8MISciIYuOIklIRiHLRJaR5eJtkRMQaZJHklJyduUh1ufV6dTTUVbkU1G3sEC29SPu9BxXn9bQsgkIxsXGLM8viqneowACcz4TPSQXQ4gDMrgFtSQr3I0sPK5J2a7OF6lIiE0Wl02jFpLIFAhlOotLoDEY1KZzNY7IhNNwNMNFCNjLopmp5lsQG8IiUUpVqAAlACSjAA4qChKIIZ1QNDcX0BkMRmMJlMZogPK5NGNFLp8dxRhZNsFSTsih9KQlqAARWkAZQYzDYXD4rVZHShSh0ak0pCmmIlvXGQ00QoQam4xlFFm42j0Fl8KhJZP2pDOlSpAEFGJqAOosanMkDg41dTlmeFqSUqYz6WUWHTGR3I-SkDPS92Z9aqP2K94lIMJKnUlgAKT1sfjQJNMOT2lTOfTmdlOcdoxUpDUOe4Fj85t8cu2YSrZBrUCpGu1TFYHBbRrbiaUnamaYzWYH6LmTldZh0ZqcZn8KkvFbn5IK0hIyHEkHVWp16-1-DBW8hHcEB0CwLWlM8dEUYxoMxO881xEciXGfRuGlVDnAfXYn1Ie5UAIKgIEScRhGSF8wDfT9V11DcDX-dptw5RAQLAnQIKgmDVB0R1jFGEcnE0PRvCcdQPWMTClRKXD8MgIiSOQMiKLkWBxDiMhUHud8zgACgmVCAEpqH9D4pII2TSKIV9xE3ejAMY4DQNIcCePY-xOMdFQ7y0AUPHQix9GMO8gnlIhhAgOBZCMkhDRs9lugQABaLiT0SxzULS9K0vccT53ISgwGitl23NYcxQsJxBmzDxejzdxC30cxtF8KZQN9eVIoOSQKgSH5MAKhM7M8bMBmMWVyvUDxWJUR15gtdQPO4YTVEmb1suwlUoD6hi4qtYcVDPCUhga69cxPKdSA8ZxIJAm1x1WgNF0qTbbLi-xpscEd1n0M16pQ5EnDu5UFPfCAnti6FvGHEa-MsDx3B8NFZnzQtRzNTQJmGVMZwVR8AxMmTiPMyzQfbfFXQMTw9GY0D6vcnNHL8nFJjNKDAiCoA */
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
