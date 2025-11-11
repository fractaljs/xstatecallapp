import { CallType } from "@/components/CallView";
import { getCallParticipants } from "@/lib/zero/queries";
import {
  CallParticipant,
  UserStatus,
  ParticipantStatus,
  User,
} from "@/prisma/generated/zero/schema";
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
  | {
      type: "INCOMING_CALL";
      initiator: User;
      call_id?: string;
      call?: CallType;
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
  | "incoming"
  | "joining"
  | "connected"
  | "disconnecting";

export const callMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QGMCGAbdBZVyAWAlgHZgB0BE6YAxAMIDyAcowKK0AqA2gAwC6ioAA4B7WAQAuBYUQEgAHogCMAFgBs3UgE4AzKtUB2TQFZ9+gEyazADgA0IAJ6Jl+q6W5Xl2-cqOLNmvVUAXyC7NEwcfGIyCipqAElGBixEgHEAfVoAQQAZHJ5+JBARMUlpWQUEFX0NTUV9FR0rI2b9VTtHBE0rbVJFVTNtI2Uzes9LELCMbFxCEnIiCQJUSSIodPD0aghpGKIAN2EAazJNyLm9pZXidc2EYkO0MqICgtkSpfKiysVdVVIWopBkNFFZrMoOogrIo+tCrDVuL5zG1tJMQGdZtEFldVrdptQwAAnQnCQmkQToFYAM1JAFtSBiovNiDibhtpvcDsInlIXnw3kUPs8KkoLBpzNptKNTL81JCEGZVEYtFLmmDQW14ajQujpucsZsNoSwCtINQsgARC3pAAKWQASux4rR4nbGFw+O9RJ8ZN9EABafr-IzcEbaUNtIE+Mzy0yuGqq8yKbiqRSKIxoxkXBnTI0m8Rmi3xADKDGYbA9hSE3uFfoVI1IZiboy8PjT5nlaa8fW6qjBZjUv00mb1mPmhuQxtNEGoAurpV5IoQ-qbvXqqfhw1Uym43XlAX0pBc+m0oO3itGyhHETHp2mN2oRdLTFYHDnxRri7r-Q0iMRKgHJs+1DeVlB0AFDG0AJJU0E9VGMa8ZiZO9MAfABVG0LSydgWFtB0nRdN1Ky9BcvlASp-SMEMAWUZwzCMbRPHgwxO0GVxuBcNNUyGHxlCsRD9XHe81lnT1BU-Mj5ADIFenhaNGIGbgm2aVjrFIKwAhUKCT10FwBNvUhCRuB8skYYsAHUWHtd8hS-cinG7FpU24IYXK8YYjHlKw+z6UYqL-SVJTMfTkMM4yRIwrCcLwx1nVdUziPE0jfXshAoOVVQvHMKwekVaFFU7SVf17eFvBDFoQuzIy1gfJ8y1fRL5x9JcBkPTLlGTKwUyU4ZtFjRi+klIwm1+Rio0qrFqqgB8bIklKpIQJVXD0EN1GTFwqIhBxEE0PjSHDZM+K8ZoLGCHUsyxYhkGEWkTLMyzrLEpra1S-0d1cNUB1DdQd12vrtq6Hd9raJT6M8eoGgm5kiGu26RPtFgACkK1m5Kl39BpegaaElO6ap4M7EwNDA7dNA4xVnO1KYb1CgArYQWREnZocOE4cxp7N6cZqBOUea5pFeJ6PzRus3u7Vy6mGaFnHg-7OllZUfD-PswWG3wobILnFhEokSTJClqTpdmkM5hntZ5h5uX5vleFR5rRc8Q8JfTPj8Z0Tsd2URsqL8TxVfoxQNYZaQSGQAsZ0i7DcLtWLCISu2XoW4wNGA3d6IHPwvFYzK3FWow6m0aFA-O0dQuuohQ-Dx8S3qlGhdsySfkRTRG0jYwXD8ywvPhYHGKaUxBn0IOIAIWBy8rh9mb2VmUJNrER7HkOwDDm5eat55BarYX7de09SG3bzht3XcDt+TsctqXadyGxV+iHkuOfn0fx+X3ECWJUlyUpcQaUJekLvmAvF+K81hrx5ALfk9c5roylC3Xs5gAj5TFO0AGZglLsQMDoZMTkehnWpnPQBz8l4gKgKJLeDd5oUSlGYUgg4ZTNlTCYQm1ElJRm8LpDi998GCTIFSVABAqAQHSOIYQGxiHiGrs+csb4oEi1StgluZg24mHVPnGMAMRhtQYio7cJhMqIiDnwgRkBhGiOARIuQsBxCmlIKgKkBZCQAApwzcG4AASmoAA3h-DBGmLERXV+Cc7ILQUa3VM7dVFdwBqeZUu1dxdSDN0dWaIiDCAgHAWQXiSI7wWoGUMsSOI9G8kMei+h5T+n+CobBzQjDbhcieDMD8CExEoGAbJicKL+EPGTFwhdMpqwJgDNM8YDpkyHNuNQQcWSSGuGsdkmB2nBJ+AfLQdSWgglop5IZOd4Ram8JlaEP0g4TinOHRZjdEDcE7NwNM+8eieFcc4G5+hGncIMpsG45zKEBiGP8ZOqtQz+A6igzopV1I5VTIdDqDEuG6kfvMKanyko5MqLxWhzQvCKkKVRLZ8t6JwMygEJJLRXH8SaTwhYsMkXPSWUoPiNDvI9A1DLawHsTxuA8GxOSXVYJBy1tS7eHSAyYyPKCZMFhpZtE0J2QItCAhgXJnoZMVM4XNODgEsOkAvlLmaF7DO9FfAAV3NKgGktaGIiggYGo65i5vNCkA8RAqKHoxFdjcVeMZYmvlh4Q8hh84GFcioKihifEmJEf4yu2q6zQhbsMZM-h-ChhTKBBskpRraULuYTKQcSAAHcAAEVjTT5sUFG0AIjBBKEPt7VshdwbuBNVQex0kNJaDbBuP6mVGJ2AAEbCHECI2kSgC41vYR4U8Da7BGSgHgcQAZ4Jtt8B2pikotq5ooOIPAoorkgDwGAAgM650ID4nYCioI4HtvPSu7tQzq30VreOzqw4QhBCAA */
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
            guard: "hasReceivers",
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
            target: "disconnecting",
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
            target: "disconnecting",
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
            target: "disconnecting",
          },
        },
      },

      incoming: {
        on: {
          ANSWER: {
            target: "joining",
          },

          REJECT: {
            target: "disconnecting",
          },
        },
      },

      joining: {
        invoke: {
          src: "joinCall",
          input: ({ context }) => ({
            callId: context.call_id!,
          }),
          onDone: {
            target: "connected",
          },
          onError: {
            target: "failed_to_connect",
          },
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
            target: "disconnecting",
          },
        },
      },

      disconnecting: {
        always: [
          {
            target: "idle",
            guard: "hasNoCallId",
            actions: {
              type: "clearCallId",
            },
          },
        ],
        invoke: {
          src: "endCall",
          input: ({ context }) => ({
            callId: context.call_id!,
          }),
          onDone: {
            target: "idle",
            actions: {
              type: "clearCallId",
            },
          },
          onError: {
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
      hasConnectedParticipants: ({ context }) => {
        return context.participants.some(
          (participant) => participant.status === ParticipantStatus.CONNECTED
        );
      },
      hasNoCallId: ({ context }) => {
        return !context.call_id;
      },
      hasReceivers: ({ event }) => {
        if (event.type === "CONNECT") {
          return !!(event.receiverIds && event.receiverIds.length > 0);
        }
        return false;
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
      endCall: fromPromise(
        async ({ input }: { input: { callId: string } }) => {
          try {
            const token = localStorage.getItem("auth_token");
            if (!token) {
              throw new Error("No authentication token found");
            }

            const response = await fetch("/api/calls/leave", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                callId: input.callId,
              }),
            });
            console.log("response", response);

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(
                errorData.error || `Failed to leave call: ${response.status}`
              );
            }

            return await response.json();
          } catch (error) {
            console.error("endCall error:", error);
            // Don't throw here - we still want to clear local state even if API fails
            console.warn("Failed to leave call via API, clearing local state");
          }
        }
      ),
      joinCall: fromPromise(
        async ({ input }: { input: { callId: string } }) => {
          try {
            const token = localStorage.getItem("auth_token");
            if (!token) {
              throw new Error("No authentication token found");
            }

            const response = await fetch("/api/calls/join", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                callId: input.callId,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(
                errorData.error || `Failed to join call: ${response.status}`
              );
            }

            return await response.json();
          } catch (error) {
            console.error("joinCall error:", error);
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
        const output = (event as unknown as { output: CreateCallOutput })
          .output;
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
          console.log("assignIncomingCall event:", event);
          context.initiator = event.initiator;
          if (event.call_id) {
            context.call_id = event.call_id;
            console.log("Set call_id from event:", event.call_id);
          } else if (event.call?.id) {
            // Fallback: extract call_id from call object if available
            context.call_id = event.call.id;
            console.log("Set call_id from call.id:", event.call.id);
          } else {
            console.warn("No call_id found in incoming call event");
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
