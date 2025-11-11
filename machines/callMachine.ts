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

export type CallState = "idle" | "initiating_call" | "failed_to_connect" | "calling" | "ringing" | "connected";

export const callMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAbdBZVyAWAlgHZgB0BE6YAxAMIDyAcowKK0AqA2gAwC6ioAA4B7WAQAuBYUQEgAHogC0ARlWkATAA5lAVgDs6nd3UGAzMs0AaEAE8lygGwAWUjvWn1ATm6mHyz7p6egC+wdZomDj4xGTEEgSokkRQAPoR6NQQ0rFEAG7CANZk6VGEJORE8YnEqekIxPloktI8vK2yImLNMkjyiKo6mqSafp5GDpr6mtPWdgimBq4OniOmOg56ptzKIWEgJbhlOVVJtRgZYABOl8KXpILoiQBmtwC2pAfR5XGS1clp53qeWETSkRFa7V6nXi0lkCgQek0elIDnUThWEyC3CcTistkQ6m2pAMAQc5hW3G4egcOlC4XOpRipCeqAIVAgKXEwjS0hIyHE1AAIgBJADKDGYbC4fA6ohhPVA8LcDmJNNRNOUC2Us0QHm4KPM4w2yic2M0dP2DMOTJZbMgnO5yF5YH51DksHEiTIqCe4iuAAotpSAJTUT5HZms9kOnlEPniSFCOXdOGIZWq9bqDVanUIJy6YYjPTcSZjRyeJwW8NM9I1agAJWFjAA4omQNCU714QMhiN-ONJoiZviENpSB4vJr0ZMTQsq1avsVznWReKmKwOG2O2DUwhPJ4Vd5uG5NAfpnoArmjMphusnBNsd5cU5TPPItbypcanWAIKMUUAOosPWW7JjuXb9DonikMYTiEvemjbA4Gx4nMTiDCizgbOo7iaqeb7YB+ZBfskdb1iwABSUqgV04GKv0eg3hejiokEgwlseuYahofjLN4WionBBGMp+37JEKYoShu0r8FCYGwhBCA7ExpKsXo7GITouZ6PerjlpSYzuNM5p7NW5ROnGLp+hAElrpKm4ynJtEKfRCDptSmbZoxV4lqQU7cBSyE6f4oR7EQwgQHAshmWAsrOQqfQICoUEaNo+iGMYZgWLmigmDorinsWyjHiYnjCUR5CULFTnyruigjMMfiUtwDgBfupjDnMih+BoB5kisiJbFBB7lYuFQnDUAKYHFtWKZoLgbJ4aKtU4xbIaYng5RYQxZhsiJeKi3hBKNEa2tGXKxvGM2dq5HjQZSbg4a1NLUtqI5wSqG0eDsaKmPeui0qZC4RrWyTXXRiUmlmKKGDoCyrYxSJ6Np0zDMYqg7JoQZeCdTIkVANTgy5iW5SpQSsTijj5m9czqUxFgof40zIWVQPvmNFnxpARMJfCazIsV+bOJSWbFlpI5wzeSFLY4OgDpWoVAA */
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
            actions: assign({
              call_id: ({ event }) => event.output,
            }),
          },
          onError: {
            target: "failed_to_connect",
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
    },
  },
  {
    guards: {
      hasOnlineParticipants: ({ context }) => {
        if (!context.call?.participants) {
          return false;
        }
        return context.call.participants.some(participant => participant.status === 'online');
      },
    },
    actors: {
      fetchCallId: fromPromise(async () => {
        // Simulating an async query with random success/failure
        return new Promise<string>((resolve, reject) => {
          setTimeout(() => {
            // 70% success rate, 30% failure rate
            if (Math.random() > 0.3) {
              resolve("123");
            } else {
              reject(new Error("Failed to generate call ID"));
            }
          }, 1000);
        });
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
      clearCallId: ({ context }) => {
        context.call_id = undefined;
        context.call = undefined;
      },
    },
  }
);

export const callActor = createActor(callMachine).start();
