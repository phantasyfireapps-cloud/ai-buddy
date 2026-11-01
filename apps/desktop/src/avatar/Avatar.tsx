import { useEffect, useMemo, useState } from "react";
import { AvatarController, type AvatarState } from "./AvatarController";
import { getAvatar } from "./avatars";
import { SvgAvatar } from "./SvgAvatar";

interface Props {
  avatarId?: string | null;
  controller?: AvatarController;
  className?: string;
  title?: string;
}

/** Selects a renderer for the avatar. Today only the 2D SVG renderer exists; a 3D one can be added here later. */
export function Avatar({ avatarId, controller, className, title }: Props) {
  const def = getAvatar(avatarId);
  const own = useMemo(() => new AvatarController(def.animation.blinkIntervalMs), []);
  const ctrl = controller ?? own;
  const [state, setState] = useState<AvatarState>(ctrl.getState());

  useEffect(() => {
    ctrl.setBlinkRange(def.animation.blinkIntervalMs);
  }, [ctrl, def]);

  useEffect(() => {
    const unsub = ctrl.subscribe(setState);
    ctrl.start();
    return () => {
      unsub();
      if (!controller) ctrl.stop();
    };
  }, [ctrl, controller]);

  return (
    <div className={className} data-testid="buddy-avatar" data-avatar-id={def.id}>
      <SvgAvatar appearance={def.appearance} state={state} idleAmplitude={def.animation.idleAmplitude} title={title ?? def.name} />
    </div>
  );
}
