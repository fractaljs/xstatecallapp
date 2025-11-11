"use client";
import { useSelector } from '@xstate/react';
import { callActor } from '@/machines/callMachine';

const CallView = () => {
    const state = useSelector(callActor, (snapshot) => snapshot.value);
    // console.log(state, "CallView");
    if (state === "idle") return null;
    return <div>CallView</div>;
};

export default CallView;