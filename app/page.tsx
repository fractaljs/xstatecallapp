"use client";
import { useSelector } from "@xstate/react";
import { callActor } from "@/machines/callMachine";

export default function Home() {
  const state = useSelector(callActor, (snapshot) => snapshot.value);
  return (
    <div className="flex grow items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex grow w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          {state === "on_call" && <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px] disabled:opacity-50"
            onClick={() => callActor.send({ type: 'DISCONNECT' })}
          >

            Disconnect
          </button>}
          <button
            disabled={state === "on_call"}
            onClick={() => callActor.send({ type: 'CONNECT' })}
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/08 px-5 transition-colors hover:border-transparent hover:bg-black/4 dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px] disabled:opacity-50"
          >
            Connect to Call
          </button>
        </div>
      </main>
    </div>
  );
}
