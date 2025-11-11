"use client";
import { useSelector } from '@xstate/react';
import { callActor } from '@/machines/callMachine';
import { Drawer } from 'vaul';
import { Group, Minimize2, Users2Icon } from 'lucide-react';

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
    console.log("state", state, callActor.getSnapshot().context);
    const showCallView = state !== "idle";

    return <Drawer.Root open={showCallView} defaultOpen={showCallView} dismissible={false}>
        <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/40" />
            <Drawer.Content className="bg-[#040303] flex flex-col mt-24 h-screen fixed bottom-0 left-0 right-0 outline-none">
                <div className="p-4 bg-[#181414] flex-1">
                    <div className="max-w-md mx-auto h-full flex flex-col justify-between items-center gap-4">
                        <Drawer.Title className="font-medium mb-4 text-white hidden">Call View</Drawer.Title>

                        <CallHeader />
                        <button className="rounded-md mt-4 w-full bg-foreground px-3.5 py-2.5 text-sm font-semibold text-background shadow-sm hover:bg-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600" onClick={() => callActor.send({ type: 'DISCONNECT' })}>Disconnect</button>
                    </div>
                </div>
            </Drawer.Content>
        </Drawer.Portal>
    </Drawer.Root>;
};

const CallHeader = () => {
    const state = useSelector(callActor, (snapshot) => snapshot.value);

    if (state === "disconnected" || state === "failed_to_connect") {
        return null;
    }
    const callStatus = state === "calling" ? "Calling" : "Ringing";
    return <div className='flex items-center justify-between gap-2 w-full'>
        <button disabled={true} className='size-10 bg-[#2c2525] rounded-full flex items-center justify-center outline-1 outline-neutral-700 active:scale-[0.95]'>
            <Minimize2 className='text-white rotate-90' size={14} />
        </button>
        <div className='flex flex-col items-center justify-center text-center'>
            <small className='text-white text-sm font-medium'>John Doe</small>
            <small className='text-gray-50 text-xs font-medium'>{callStatus}</small>
        </div>
        <button className="size-10 bg-[#2c2525] rounded-full flex items-center justify-center outline-1 outline-neutral-700 active:scale-[0.95]">
            <Users2Icon className="text-white" size={14} />
        </button>
    </div>
}

export default CallView;