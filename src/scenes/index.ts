/* Scene registry: every chapter's scene code is its own chunk, fetched only when a view nears the screen. */
import type { SceneData } from "../engine/prims";
import type { Pal } from "../lib";

export type CascadeBuild = (k: number, t: number, P: Pal) => SceneData;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LiveBuild = (p: any, t: number, P: Pal, b: number, m: number) => SceneData;

export const CASCADES = {
  rent: () => import("./rent").then((m) => m.rentScene as CascadeBuild),
  grocery: () => import("./grocery").then((m) => m.groceryScene as CascadeBuild),
  loans: () => import("./loans").then((m) => m.loanScene as CascadeBuild),
  tax: () => import("./tax").then((m) => m.taxScene as CascadeBuild),
  cap: () => import("./cap").then((m) => m.capScene as CascadeBuild),
  money: () => import("./money").then((m) => m.moneyScene as CascadeBuild),
};
export const LIVES = {
  rentLive: () => import("./rent").then((m) => m.rentLive as LiveBuild),
  stab: () => import("./rent").then((m) => m.stabLive as LiveBuild),
  groceryLive: () => import("./grocery").then((m) => m.groceryLive as LiveBuild),
  loanLive: () => import("./loans").then((m) => m.loanLive as LiveBuild),
  taxLive: () => import("./tax").then((m) => m.taxLive as LiveBuild),
  capLive: () => import("./cap").then((m) => m.capLive as LiveBuild),
  tide: () => import("./dollar").then((m) => m.tideWorld as LiveBuild),
  ice: () => import("./dollar").then((m) => ((p: { fr: number }, t: number, P: Pal) => m.iceWorld(p.fr, t, P)) as LiveBuild),
};
export type CascadeKey = keyof typeof CASCADES;
export type LiveKey = keyof typeof LIVES;
