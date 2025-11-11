"use client";
import { useSelector } from '@xstate/react';
import { callActor } from '@/machines/callMachine';
import { Drawer } from 'vaul';

export type CallParticipants = {
    name: string;
    id: string;
    status: 'online' | 'offline' | 'busy';
}

export type CallType = {
    callId: string;
    participants: CallParticipants[];
}

const CallView = () => {
    const state = useSelector(callActor, (snapshot) => snapshot.value);
    console.log("state", state);
    const showCallView = state !== "idle";

    return <Drawer.Root open={showCallView} defaultOpen={showCallView} dismissible={false}>
        <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40" />
            <Drawer.Content className="bg-white flex flex-col mt-24 h-screen fixed bottom-0 left-0 right-0 outline-none">
                <div className="p-4 bg-white flex-1">
                    <div className="max-w-md mx-auto">
                        <Drawer.Title className="font-medium mb-4 text-white hidden">Call View</Drawer.Title>

                    </div>
                    <button className="rounded-md mt-4 w-full bg-foreground px-3.5 py-2.5 text-sm font-semibold text-background shadow-sm hover:bg-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600" onClick={() => callActor.send({ type: 'DISCONNECT' })}>Disconnect</button>
                </div>
            </Drawer.Content>
        </Drawer.Portal>
    </Drawer.Root>;
};

const dummyCall: CallType = {
    callId: '123',
    participants: [
        { name: 'John Doe', id: '1', status: 'online' },
        { name: 'Jane Doe', id: '2', status: 'offline' },
        { name: 'Jim Doe', id: '3', status: 'busy' },
    ],
}


export default CallView;