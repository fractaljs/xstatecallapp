"use client";
import { useEffect, useState } from "react";
import { useSelector } from "@xstate/react";
import { callActor } from "@/machines/callMachine";
import { getCalls, getUsers } from "@/lib/zero/queries";
import { QueryResult, useQuery } from "@rocicorp/zero/react";
import { useAuthContextValues } from "@/components/hooks/useAuthContextValue";
import { CallStatus, User } from "@/prisma/generated/zero/schema";

export default function Home() {
  const state = useSelector(callActor, (snapshot) => snapshot.value);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const toggleUserSelection = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const context = useAuthContextValues();
  const [callsFromDB] = useQuery(getCalls(context));
  const [usersFromDB] = useQuery(getUsers(context));
  const incomingCalls = callsFromDB.filter(call => call.initiatorId !== context.userID);
  console.log("incomingCalls", incomingCalls, state);

  useEffect(() => {
    if (incomingCalls.length > 0 && usersFromDB.length > 0) {
      const incomingCall = incomingCalls[0];
      const initiator = usersFromDB.find(user => user.id === incomingCall.initiatorId);

      if (initiator) {
        callActor.send({
          type: 'INCOMING_CALL',
          initiator: initiator,
          call_id: incomingCall.id,
          call: incomingCall
        });
      }
    }
  }, [incomingCalls, usersFromDB]);



  return (
    <div className="flex grow items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex grow w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <>{context.userID}</>
          <Users selectedUsers={selectedUsers} onUserToggle={toggleUserSelection} />
          {state === "on_call" && <button

            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/08 px-5 transition-colors hover:border-transparent hover:bg-black/4 dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px] disabled:opacity-50"
            onClick={() => callActor.send({ type: 'DISCONNECT' })}
          >

            Disconnect
          </button>}
          <button
            disabled={state === "on_call"}
            onClick={() => callActor.send({
              type: 'CONNECT',
              receiverIds: selectedUsers.map(user => user.id),
              callType: 'AUDIO'
            })}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px] disabled:opacity-50"
          >
            {selectedUsers.length > 0
              ? `Call ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`
              : 'Connect to Call'}
          </button>
        </div>
      </main>
    </div>
  );
}

interface UsersProps {
  selectedUsers: User[];
  onUserToggle: (user: User) => void;
}

const Users = ({ selectedUsers, onUserToggle }: UsersProps) => {
  const context = useAuthContextValues();
  const [usersFromDb, details] = useQuery(getUsers(context));

  const users = usersFromDb.filter(user => user.id !== context.userID);

  if (!users) return <div>Loading...</div>
  return <div className="flex flex-col gap-2">
    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
      {selectedUsers.length > 0 && `${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''} selected`}
    </div>
    {users.map((user: User) => {
      const isSelected = selectedUsers.some(u => u.id === user.id);
      return (
        <button
          key={user.id}
          onClick={() => onUserToggle(user)}
          className={`p-3 rounded-lg border text-left transition-colors ${isSelected
            ? 'bg-blue-100 border-blue-300 dark:bg-blue-900 dark:border-blue-700'
            : 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700'
            }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded border-2 transition-colors ${isSelected
              ? 'bg-blue-500 border-blue-500'
              : 'border-gray-300 dark:border-gray-600'
              }`}>
              {isSelected && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div>
              <p className="font-medium">{user.email}</p>
              {user.name && <p className="text-sm text-gray-600 dark:text-gray-400">{user.name}</p>}
            </div>
          </div>
        </button>
      );
    })}
  </div>
}