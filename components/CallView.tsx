"use client";
import { useSelector } from '@xstate/react';
import { callActor } from '@/machines/callMachine';
import { Drawer } from 'vaul';

const CallView = () => {
    const state = useSelector(callActor, (snapshot) => snapshot.value);

    if (state === "idle") return null;
    return <div className='bg-zinc-800'>CallView</div>;
};

export default CallView;