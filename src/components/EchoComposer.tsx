import { useState } from "react";
import type { EchoMood, EchoVisibility } from "../types";

type Props = {
  onSave: (input: { text: string; photo: string | null; mood: EchoMood; visibility: EchoVisibility }) => void;
};

export default function EchoComposer({ onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [mood, setMood] = useState<EchoMood>("calm");
  const [visibility, setVisibility] = useState<EchoVisibility>("private");

  function selectPhoto(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  if (!open) return <button type="button" className="echo-prompt" onClick={() => setOpen(true)}>✦ Leave an Echo here?</button>;

  return (
    <section className="echo-composer" aria-label="Leave an Echo">
      <div><span className="overline">Leave an Echo here?</span><p className="faint">A tiny bloom will stay at this exact spot.</p></div>
      <input className="echo-composer__text" maxLength={120} value={text} onChange={(event) => setText(event.target.value)} placeholder="One line about this moment…" aria-label="Echo text" />
      <div className="echo-composer__row">
        <label className="echo-photo">{photo ? "Photo added ✓" : "Add one photo"}<input type="file" accept="image/*" onChange={(event) => selectPhoto(event.target.files?.[0])} /></label>
        <div className="echo-moods" aria-label="Mood">
          {(["calm", "curious", "energize"] as const).map((value) => <button key={value} type="button" className={mood === value ? "echo-choice echo-choice--on" : "echo-choice"} onClick={() => setMood(value)}>{value}</button>)}
        </div>
      </div>
      <label className="echo-visibility">Visibility <select value={visibility} onChange={(event) => setVisibility(event.target.value as EchoVisibility)}><option value="private">Private</option><option value="friends">Friends-only</option><option value="public">Public (opt-in)</option></select></label>
      <p className="faint">Echoes are saved on this device. Sharing preferences are ready for when sharing is connected.</p>
      <div className="echo-composer__actions"><button type="button" className="btn btn--secondary" onClick={() => setOpen(false)}>Not now</button><button type="button" className="btn btn--primary" onClick={() => { onSave({ text: text.trim(), photo, mood, visibility }); setOpen(false); }}>Plant bloom</button></div>
    </section>
  );
}
