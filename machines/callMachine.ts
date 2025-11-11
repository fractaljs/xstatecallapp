import { CallType } from "@/components/CallView";
import { getCallParticipants } from "@/lib/zero/queries";
import { CallParticipant, UserStatus } from "@/prisma/generated/zero/schema";
import { QueryResultType } from "@rocicorp/zero";
import { createMachine, createActor, fromPromise, assign } from "xstate";

interface ApiCallResponse {
  id: string;
}

interface CallContext {
  call_id?: string;
  call?: CallType;
  participants: QueryResultType<typeof getCallParticipants>[number][];
}

type CallEvent =
  | { type: "CALL"; call_id?: string; call?: CallType }
  | { type: "CONNECT"; receiverIds?: string[]; callType?: "AUDIO" | "VIDEO" }
  | { type: "RING" }
  | {
      type: "UPDATE_PARTICIPANT";
      participants: QueryResultType<typeof getCallParticipants>[number][];
    }
  | {
      type: "ADD_PARTICIPANT";
      participants: QueryResultType<typeof getCallParticipants>[number][];
    }
  | { type: "ANSWER" }
  | { type: "DISCONNECT" }
  | { type: "REJECT" };

export type CallState =
  | "idle"
  | "initiating_call"
  | "call_created"
  | "failed_to_connect"
  | "calling"
  | "ringing"
  | "connected";

export const callMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAbdBZVyAWAlgHZgB0BE6YAxAMIDyAcowKK0AqA2gAwC6ioAA4B7WAQAuBYUQEgAHogCMAFgBs3UgE5uAVgDMADgDsmvcqPG9AGhABPROs2kj3M3tUAmIzsWbVOgF8AmzRMHHxiMmIJAlRJIigAfVD0aghpKKIAN2EAazIU8MISciIYuOIklIRiHLRJaR5eJtkRMQaZJHkld1VSHQNFDz09HwMPA2UbewRB0kVB425dRSMvVT0gkIxsXGLM8viqneowACcz4TPSQXQ4gDMrgFtSQr3I0sPK5J2a7OF6lIiE0Wl02jFpLIFAghtpnMM9B5VkZFGZVNNEB5-FpEQYBkjjKpLFsQG8IiUUskzmA4pBqABBAAijMSAAV6QAldgASVo3PZjC4fFaoghnVA0IAtIpVH0dNxlMMFUZVENlDoPBiEEYLM5XBM1opuKrFIFgqSdkUPpTkNTaRBqIzuQBlBjMNhC-hg0UdKGYxWkDxBpF6IzqxSrTV2JSoozzTQGIlBtSozQksn7V47Kk08R00FCH1Av0ISVBvTzFULbxqZTcBNavxxixGPQLVSKzwqdOW94UnaVR0ut2sDgFkDg31daGrJwa2vmTRqjZGLUDDQGUzy7hGnTKU0GHthPsFAcJagAVVZjPp7BYbM5PL5As9IvaxeniElngM-WUo1lbhxj8AwtV3DxSETYZvFlVQE1NI9dnJU9MEHcdJw-CUvxReZDATBNXFbLxrGjGEPE0HRSFVVQTCxcxPE0DxEKtEozkqQd6UYZ0AHUWA5dCi0hT8EH-OMBlVVx5RGGsdC1RNfyGU15SkkZEWYk9SDYhJBydV0mFHV9vXfISsIQTw4w2fcgONbgPD3EiZlbZRcNGINUTMNV1OQ15pBIZA8wdXSRw9ATjPFboYV0Jx1l8HQLCRHRGLk4xSFDMxTGMNZQy8zN7lQAgqAgRJxGEZJfLAfyhz090x2FIyxRLXdoqrCj4tNJLSMVCz9DixN1RVPRdByj48oKyBitK5BysquRYHEWlSFQe48zOAAKQblgASmoDMRvywqJrKog-PEUKGuEprAxa3qEo6mY20ozQ6wImU4LxRQgnNIhhAgOBZF2kg33O0zvxVP8APUYCiS1b9SGWZZtA1Y0UW0ZRhpKCgqCBqdTKGWV5gMRFFR0GidUULVIa0Oy63IhNRmUNNzQBg5JAqBIfkwbHMIimVlF-Pw6wGUYVHVMCNkgltQzUQwZQVdGUPQHN7S5kyIu4MCd0UKjCf-ZZzB3bx5azVCEhV8KpQArR5XGeUGaemU5J1SCDETCMFX3fQjCNrSoEqM2S3VZy+c9rFuAsHQI7AuynD8PQ-ATCODGWQ8md7bypuOiqAv94S8Wcjx9zsnwVA8etNEbU1SEFuPSYN1UjdGg6SqOk6c9MwY5yszRu9R40tWUAMRncuPW2MLFNk+oA */
    id: "callMachine",
    initial: "idle",
    types: {
      context: {} as CallContext,
      events: {} as CallEvent,
    },
    context: {
      call_id: undefined,
      call: undefined,
      participants: [],
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
          src: "createCallEntry",
          input: ({ event }) => ({
            receiverIds:
              event.type === "CONNECT" ? event.receiverIds : undefined,
            type: event.type === "CONNECT" ? event.callType : undefined,
          }),
          onDone: {
            target: "call_created",
            actions: {
              type: "assignCallDataFromQuery",
            },
          },
          onError: {
            target: "failed_to_connect",
          },
        },
      },

      call_created: {
        always: {
          target: "calling",
          guard: "hasParticipants",
        },
        on: {
          ADD_PARTICIPANT: {
            actions: {
              type: "addParticipant",
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

      calling: {
        always: {
          target: "ringing",
          guard: "hasOnlineParticipants",
        },
        on: {
          DISCONNECT: {
            target: "idle",
            actions: {
              type: "clearCallId",
            },
          },

          UPDATE_PARTICIPANT: {
            actions: {
              type: "updateParticipant",
            },
          },
        },
      },

      ringing: {
        on: {
          ANSWER: {
            target: "connected",
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
        return context.participants.some(
          (participant) => participant.user?.status === UserStatus.ONLINE
        );
      },
      hasParticipants: ({ context }) => {
        return (
          (context.participants && context.participants.length > 0) || false
        );
      },
    },
    actors: {
      createCallEntry: fromPromise(
        async ({
          input,
        }: {
          input?: { receiverIds?: string[]; type?: "AUDIO" | "VIDEO" };
        }) => {
          try {
            // Get authentication token from localStorage
            const token = localStorage.getItem("auth_token");
            if (!token) {
              throw new Error("No authentication token found");
            }

            // Make API call to start the call
            const response = await fetch("/api/calls/start", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                receiverIds: input?.receiverIds || [],
                type: input?.type || "AUDIO",
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(
                errorData.error || `Failed to start call: ${response.status}`
              );
            }

            const data = await response.json();
            const call: ApiCallResponse = data.call;

            // Map API response to CallType format

            return {
              call_id: call.id,
            };
          } catch (error) {
            console.error("createCallEntry error:", error);
            // Throw the error to trigger onError transition to failed_to_connect
            throw error;
          }
        }
      ),
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
      updateParticipant: ({ context, event }) => {
        if (event.type === "UPDATE_PARTICIPANT") {
          context.participants = event.participants.map(
            (participant) => participant
          );
        }
      },
      addParticipant: ({ context, event }) => {
        if (event.type === "ADD_PARTICIPANT") {
          if (!context.participants) {
            context.participants = [];
          }
          context.participants.push(...event.participants);
        }
      },
    },
  }
);

export const callActor = createActor(callMachine).start();
