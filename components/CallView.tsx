"use client";
import { useSelector } from '@xstate/react';
import { callActor } from '@/machines/callMachine';
import { Drawer } from 'vaul';
import { Minimize2, Users2Icon } from 'lucide-react';
import { useQuery } from '@rocicorp/zero/react';
import { getCallParticipants, getUsers } from '@/lib/zero/queries';
import { useAuthContextValues } from './hooks/useAuthContextValue';
import { UserStatus } from '@/prisma/generated/zero/schema';
import { QueryResultType } from '@rocicorp/zero';
import { useEffect } from 'react';

export type CallParticipants = {
    name: string;
    id: string;
    status: 'online' | 'offline' | 'busy';
}

// export type CallType = {
//     callId: string;
//     participants: CallParticipants[];
// }

const CallView = () => {
    const state = useSelector(callActor, (snapshot) => snapshot.value);
    console.log("state", state, callActor.getSnapshot().context);
    const showCallView = state !== "idle";

    const context = useAuthContextValues();
    const callId = useSelector(callActor, (snapshot) => snapshot.context.call_id);
    const [participantsFromDB] = useQuery(getCallParticipants(context, callId || ""));

    const participants = useSelector(callActor, (snapshot) => snapshot.context.participants);

    useEffect(() => {
        if (participantsFromDB) {
            const participantsToAdd = participantsFromDB.filter(participant => participant.userId !== context.userID);
            callActor.send({ type: 'ADD_PARTICIPANT', participants: participantsToAdd });
            callActor.send({ type: 'UPDATE_PARTICIPANT', participants: participantsToAdd });
        }
    }, [participantsFromDB, context.userID]);

    const [users] = useQuery(getUsers(context));
    console.log("users", users);

    return <Drawer.Root open={showCallView} defaultOpen={showCallView} dismissible={false}>
        <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40" />
            <Drawer.Content className="bg-[#040303] flex flex-col mt-24 h-screen fixed bottom-0 left-0 right-0 outline-none">
                <div className="p-4 bg-[#181414] flex-1">
                    <div className="max-w-md mx-auto h-full flex flex-col justify-between items-center gap-4">
                        <Drawer.Title className="font-medium mb-4 text-white hidden">Call View</Drawer.Title>

                        <CallHeader participants={participants} />

                        <button className="rounded-md mt-4 w-full bg-foreground px-3.5 py-2.5 text-sm font-semibold text-background shadow-sm hover:bg-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600" onClick={() => callActor.send({ type: 'DISCONNECT' })}>Disconnect</button>
                    </div>
                </div>
            </Drawer.Content>
        </Drawer.Portal>
    </Drawer.Root>;
};


const CallHeader = ({ participants }: { participants: QueryResultType<typeof getCallParticipants>[number][] }) => {
    const state = useSelector(callActor, (snapshot) => snapshot.value);


    const context = useAuthContextValues();
    const callStatus = participants.length > 0 && participants.some(participant => participant.user?.status === UserStatus.ONLINE) ? "Ringing" : "Calling";

    const [usersfromDb,] = useQuery(getUsers(context));
    const resetUsers = usersfromDb.filter(user => user.id !== context.userID && !participants.some(participant => participant.userId === user.id));
    if (state === "disconnected" || state === "failed_to_connect") {
        return null;
    }


    return <div className='flex items-center justify-between gap-2 w-full'>
        <button disabled={true} className='size-10 bg-[#2c2525] rounded-full flex items-center justify-center outline-1 outline-neutral-700 active:scale-[0.95]'>
            <Minimize2 className='text-white rotate-90' size={14} />
        </button>
        <div className='flex flex-col items-center justify-center text-center'>
            <small className='text-white text-sm font-medium'>John Doe</small>
            <small className='text-gray-50 text-xs font-medium'>{callStatus}</small>
        </div>

        <Drawer.NestedRoot>
            <Drawer.Trigger asChild>
                <button className="size-10 bg-[#2c2525] rounded-full flex items-center justify-center outline-1 outline-neutral-700 active:scale-[0.95]">
                    <Users2Icon className="text-white" size={14} />
                </button>
            </Drawer.Trigger>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40" />
                <Drawer.Content className="bg-gray-100 flex flex-col rounded-t-[10px] lg:h-[327px] h-fit min-h-[300px] mt-24 max-h-[50%] fixed bottom-0 left-0 right-0 overflow-y-auto">
                    <div className="flex flex-col items-left justify-center text-black space-y-2 p-4">
                        <h1 className='text-black text-lg font-medium tracking-tighter'>Call Participants</h1>
                        <div className='p-2 bg-gray-200 rounded-md space-y-4'>
                            {(participants).map((participant: QueryResultType<typeof getCallParticipants>[number]) => (
                                <div key={participant.id} className='flex items-center justify-between gap-2'>
                                    <p className='text-black text-base font-medium'>{participant.user?.email}</p>
                                    <p className='text-black text-base font-medium'>{participant.user?.status === UserStatus.ONLINE ? "Ringing" : "Offline"}</p>
                                </div>
                            ))}
                        </div>
                        <h1 className='text-black text-lg font-medium tracking-tight'>Other users</h1>
                        <div className='p-2 bg-gray-200 rounded-md space-y-4'>
                            {(resetUsers).map((user: QueryResultType<typeof getUsers>[number]) => (
                                <div key={user.id} className='flex items-center justify-between gap-2'>
                                    <p className='text-black text-base font-medium'>{user?.email}</p>
                                    <button className='bg-foreground text-background px-3 py-1 rounded-md text-sm font-medium'>Add</button>
                                </div>
                            ))}
                        </div>
                    </div>

                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.NestedRoot >
    </div >
}

export default CallView;