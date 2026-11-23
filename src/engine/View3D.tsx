import { useEffect, useRef, useState } from "react";
import type { SceneData } from "./prims";
import type { ViewHandle } from "./renderer";
import { useSeen } from "../lib";

export type FrameOf<B> = (b: B, t: number, dt: number) => SceneData;

/**
 * A 3D view slot. Nothing heavy happens until the box is within ~600px of the screen; then the
 * shared renderer and this scene's chunk load together and the slot registers with the single
 * WebGL canvas. The frame function lives in a ref, so slider changes never re-render this tree.
 */
export function View3D<B>(props: { load: () => Promise<B>; frame: { current: FrameOf<B> }; hint?: string; yaw0?: number; pitch0?: number; aspect?: number; label?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const lab = useRef<HTMLDivElement>(null);
  const near = useSeen(host, "600px 0px");
  const handle = useRef<ViewHandle | null>(null);
  const [ready, setReady] = useState(false);
  const { load, frame, yaw0, pitch0 } = props;
  useEffect(() => {
    if (!near) return;
    let dead = false;
    Promise.all([import("./renderer"), load()]).then(([R, b]) => {
      if (dead || !host.current || !lab.current) return;
      handle.current = R.registerView({ el: host.current, labels: lab.current, frame: (t, dt) => frame.current(b, t, dt), yaw0, pitch0 });
      setReady(true);
    });
    return () => { dead = true; handle.current?.dispose(); handle.current = null; };
  }, [near, load, frame, yaw0, pitch0]);
  return (
    <div ref={host} className={"view3d" + (ready ? " ready" : "")} style={{ aspectRatio: String(props.aspect ?? 1.6) }} role="img" aria-label={props.label ?? "Interactive 3D illustration (illustrative, not to scale)"}>
      <div ref={lab} className="view3d-labels" aria-hidden="true" />
      {!ready ? <div className="view3d-wait" aria-hidden="true" /> : null}
      <div className="view3d-zoom">
        <button className="btn sm" aria-label="Zoom out" onClick={() => handle.current?.zoom(1 / 1.2)}>−</button>
        <button className="btn sm" aria-label="Zoom in" onClick={() => handle.current?.zoom(1.2)}>+</button>
        <button className="btn sm" onClick={() => handle.current?.reset()}>Reset</button>
      </div>
      <div className="view3d-hint">{props.hint ?? "Drag to rotate · illustrative, not to scale"}</div>
    </div>
  );
}
