import { Button } from "@/components/ui/button";
import { Bot, Icon } from "../ui";

/** First thing in the chat: the photo-to-lead entry. */
export function SnapHero({ onSnap }: { onSnap: () => void }) {
  return (
    <div className="sheet overflow-hidden">
      <div className="bg-gradient-to-b from-brand-soft to-white px-5 pb-5 pt-6 text-center">
        <div className="flex justify-center"><Bot size={72} /></div>
        <h2 className="t-display mx-auto mt-4 max-w-sm">Spot a lift? Let&apos;s turn it into an <span className="text-brand">opportunity.</span></h2>
        <p className="t-body mx-auto mt-2 max-w-sm text-muted">Upload photos of the lift, and I&apos;ll read the details and ask a few quick questions.</p>
        <div className="mx-auto mt-4 grid max-w-sm grid-cols-3 gap-2 text-[12px] text-muted">
          {[["camera", "Up to 6 photos"], ["bolt", "AI reads the details"], ["flag", "Creates the right lead"]].map(([i, t]) => <div key={t} className="flex flex-col items-center gap-1.5"><span className="grid h-10 w-10 place-items-center rounded-full bg-white text-brand ring-1 ring-line"><Icon n={i} s={18} /></span>{t}</div>)}
        </div>
        <Button onClick={onSnap} className="mx-auto mt-5 flex h-11 w-full max-w-sm gap-2 px-4"><Icon n="camera" s={17} /> Take or upload photos</Button>
      </div>
    </div>
  );
}
