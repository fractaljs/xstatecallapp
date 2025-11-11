import { CallType } from "@/components/CallView";
import { getCallParticipants } from "@/lib/zero/queries";
import { CallParticipant, UserStatus, ParticipantStatus, User } from "@/prisma/generated/zero/schema";
import { QueryResultType } from "@rocicorp/zero";
import { createMachine, createActor, fromPromise } from "xstate";

interface ApiCallResponse {
  id: string;
  initiatorId: string;
  status: string;
  type: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
  initiator: User;
  participants: Array<{
    id: string;
    callId: string;
    userId: string;
    joinedAt: string;
    leftAt?: string;
    role: string;
    status: string;
    user: User;
  }>;
}

interface CreateCallOutput {
  call_id: string;
  call: ApiCallResponse;
  initiator: User;
}

interface CallContext {
  call_id?: string;
  call?: CallType;
  initiator?: User;
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
  | { type: "INCOMING_CALL"; initiator: User; call_id?: string; call?: CallType }
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
  | "incoming"
  | "connected";

export const callMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAbdBZVyAWAlgHZgB0BE6YAxAMIDyAcowKK0AqA2gAwC6ioAA4B7WAQAuBYUQEgAHogCMAFgBs3UgE4AzKtUB2TQFZ9+gEyazADgA0IAJ6Jl+q6W5Xl2-cqOLNmvVUAXyC7NEwcfGIyCipqAElGBixEgHEAfVoAQQAZHJ5+JBARMUlpWQUEFX0NTUV9FR0rI2b9VTtHBE0rbVJFVTNtI2Uzes9LELCMbFxCEnIiCQJUSSIodPD0aghpGKIAN2EAazJNyLm9pZXidc2EYkO0MqICgtkSpfKiysVdVVIWopBkNFFZrMoOogrIo+tCrDVuL5zG1tJMQGdZtEFldVrdptQwAAnQnCQmkQToFYAM1JAFtSBiovNiDibhtpvcDsInlIXnw3kUPs8KkoLBpzNptKNTL81JCEGZVEYtFLmmDQW14ajQujpucsZsNoSwCtINQsgARC3pAAKWQASux4rR4nbGFw+O9RJ8ZN9EABafr-IzcEbaUNtIE+Mzy0yuGqq8yKbiqRSKIxoxkXBnTI0m8Rmi3xADKDGYbA9hSE3uFfoVI1IZiboy8PjT5nlaa8fW6qjBZjUv00mb1mPmhuQxtNEGoAurpV5IoQ-qbvXqqfhw1Uym43XlAX0pBc+m0oO3itGyhHETHp2mN2oRdLTFYHDnxRri7r9U0AIH2+cOp-y8eUWg0KwdBDbhk2GdMrGvGYmTvTAHwAVRtC0snYFhbQdJ0XTdSsvQXL5QEqf0jBDAFlGcMwjG0TxVE0QxO0GVxuBcNNUyGHxlHgnUswNe81lnT1BU-Uj5ADBo+m0CD5O4LwpRPVjjFIVMDEsbc2gsMwEP1eZCRuB8skYYsAHUWHtd8hS-MinG7FpU0UkNJX0YYjHlKw+z6UZKMRRTJSlfTb1IIy1jQjCsJwu1HWdV1TKI8SSN9eyEGUPxG1PXdmIy-pKM7QDSG0IDTCUlMMwE0ckLC4yRKfMtXyS+cfSXAZD1UBjkysFNuDozxYwY2ShibX4uoHEKavCqAHxsiTUqkhAlVcPQQ3UZMXEoiEHEQTQ+OK6DQx6TaLGCKqbxq4hkGEWkTLMyzrLElrazS-0d1cNUB1DdQdz27R9x3Yq2j6-rTxlSbsyum6H3tFgACkKzmlKlze9xSE+nc1FDXcBp2qpuGg9TFR8XRFICaEIYNaQSGQAsZ3QzDsNwuKCMSpHWrrYwND7AnLCMAc-BAvGgU6tw1qMOo5LTSnx2psBacLEtGsRp6P2R79EV-MxI2MFw-MsLz4SBhimlMQZ9BlsgqVQAgqAgdJxGEDY5dpx8lZfFWqzVjm0pgrWdZMdUJZjPGRg6+jA+3ExOsRS3SGt23IAdp3rqIGnxGoORYHEU1SFQKkC0JAAKcMCYASmoQT5gTu3k+dtP5fEdmXsWv3GwDvX0wNvHT2VPbdx6oNul8EIdSIYQIDgWQq7AYifcWijumo2j6MY5jNHlCitH8YfLxo7whjj2JZ+S+efkVf5QSlEYjAMGV5XUVw+Z3Cxuh44dzsQyHFkka41nZTAc8W4-G3E-bciIei+Bop5YWot4Ram8J1aEP044TinHTIBdlFrcE7NBGEfYGKl2cNBdyqDhJQEwZJciQx-hczBCGZQ-gMrtDxvCQ8VgOGpmTDRdMXg47TRuJQhalReKkD4vRcw6hNoFWFnRX8AQSpMWaGBdwR8iDXVumsIRS4VBgnRgQjUzgBi2GFs4Xo7gwwcO8D1ZiqCXYYNPsAqEwxGwZTor4FQZgcr7nTGIxEijTAkNTHHGuSdHb13Ttous0JfywRyv4bGLDOg0TMMVU8QVmJyUkdqEIQA */
    id: "callMachine",
    initial: "idle",
    types: {
      context: {} as CallContext,
      events: {} as CallEvent,
    },
    context: {
      call_id: undefined,
      call: undefined,
      initiator: undefined,
      participants: [],
    },
    states: {
      idle: {
        on: {
          CONNECT: {
            target: "initiating_call",
          },
          INCOMING_CALL: {
            target: "incoming",
            actions: {
              type: "assignIncomingCall",
            },
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
        always: {
          target: "connected",
          guard: "hasConnectedParticipants",
        },
        on: {
          ANSWER: {
            target: "connected",
          },

          UPDATE_PARTICIPANT: {
            actions: {
              type: "updateParticipant",
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

      incoming: {
        on: {
          ANSWER: {
            target: "connected",
          },

          REJECT: {
            target: "idle",
            actions: {
              type: "clearCallId",
            },
          }
        },
      },

      connected: {
        on: {
          UPDATE_PARTICIPANT: {
            actions: {
              type: "updateParticipant",
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
      }
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
      hasConnectedParticipants: ({ context }) => {
        return context.participants.some(
          (participant) => participant.status === ParticipantStatus.CONNECTED
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
              call: call,
              initiator: call.initiator,
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
      assignCallDataFromQuery: ({ context, event }) => {
        const output = (event as unknown as { output: CreateCallOutput }).output;
        if (output?.call_id) {
          context.call_id = output.call_id;
        }
        if (output?.call) {
          context.call = output.call;
        }
        if (output?.initiator) {
          context.initiator = output.initiator;
        }
      },
      assignIncomingCall: ({ context, event }) => {
        if (event.type === "INCOMING_CALL") {
          context.initiator = event.initiator;
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
        context.initiator = undefined;
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
