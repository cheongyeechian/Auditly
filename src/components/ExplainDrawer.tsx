"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";

export default function ExplainDrawer({ title, content }: { title: string; content: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-controls={id}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
      >
        <Info className="h-4 w-4" aria-hidden /> Explain
      </button>
      <dialog ref={dialogRef} id={id} className="rounded-lg p-0 max-w-lg w-[90vw] bg-white dark:bg-zinc-900">
        <form method="dialog">
          <header className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold">{title}</h2>
            <button className="text-sm text-gray-500 hover:text-gray-900" aria-label="Close" onClick={() => setOpen(false)}>
              ✕
            </button>
          </header>
          <div className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
            {content}
          </div>
          <div className="px-4 pb-4">
            <button className="mt-2 rounded-md bg-blue-600 text-white text-sm px-3 py-2" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}



