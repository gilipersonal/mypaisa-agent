/* MA-290 · the demo's one state. Pure data (no functions), so a step can be rebuilt by replaying actions from reset
   and a side branch can keep a copy of where it left the walk. */
export type DoorId = 'web' | 'phone' | 'iphone' | 'ipad';
export type ClockId = 'd0' | 'd1' | 'd2' | 'd3' | 'd3e' | 'd4';
export type MemberId = 'arun' | 'asha';
export type Ccy = 'GBP' | 'INR';

export interface Owned { id: string; kind: string; name: string; country: 'UK' | 'IN' | string; ccy: Ccy | string; owners: [string, number][]; [k: string]: any }
export interface Asset extends Owned { value: number; liquidity: string; account?: string }
export interface Debt extends Owned { balance: number; payment?: number; ends?: string }

/** One audit row; a Confirm writes exactly one (lesson 9). Canonical rows come from demo-ledger-v4.json by id. */
export interface AuditRow {
  id: string; at: string; day?: ClockId | string; actor: string; via: string; kind: string;
  record?: string | null; field?: string | null; before?: number | string | null; after?: number | string | null;
  ccy?: string; summary: string; run?: string | null; file?: string | null; illustrative?: boolean;
}
export interface Run {
  id: string; at: string; trigger: string; title: string; status: string;
  steps: { at: string; label: string; t?: string }[];
  model_calls: { model: string; in: number; out: number; cost_usd: number; t?: string }[];
  tools: { name: string; ms: number | string }[];
  cost_usd: number; events: string[]; [k: string]: any;
}
export interface FileRec { id: string; name: string; kind: string; bytes: number; received_at: string; from: string; via: string; statement?: string; events: string[] }

/* ---------- chat: the renderer's shapes (PrototypeV4Chat's markup) ---------- */
export type Action = { type: string; [k: string]: any };
export interface ChipT { t: string; cls?: string; act?: Action | Action[] }
export type CardPart =
  | { k: 'done'; key: string; v: string }
  | { k: 'q'; t: string; chips: ChipT[] }
  | { k: 'kv'; key: string; v: string; money?: boolean }
  | { k: 'p'; t: string; cls?: string }
  | { k: 'strong'; t: string }
  | { k: 'note'; icon: string; t: string }
  | { k: 'flag'; t: string }
  | { k: 'lock'; t: string }
  | { k: 'hdr'; t: string; r?: string }
  | { k: 'line'; icon?: string; lead?: string; name: string; sub?: string; v?: string; tag?: string; tagCls?: string }
  | { k: 'amb'; name: string; sub?: string; v: string; pill: string; pillCls?: string; ok?: boolean; act?: Action | Action[]; chips?: ChipT[] }
  | { k: 'tiles'; tiles: { key: string; v: string; s?: string; tag?: string }[] }
  | { k: 'files'; files: { name: string }[] }
  | { k: 'meter'; w: string; s: string }
  | { k: 'table'; rows: { c: string; a: string; p: string }[] }
  | { k: 'fig'; v: string; s?: string }
  | { k: 'big'; t: string; cls?: string; act?: Action | Action[] }
  | { k: 'linkBtn'; t: string; cls?: string; act?: Action | Action[] }
  | { k: 'chart'; ch: import('../lib/chart').ChartSpec };
export interface ChatCard {
  cls?: string; anchor?: string;
  chip?: string; chipIcon?: string; right?: string;
  over?: string; cancel?: Action | Action[] | null;
  title?: string; ok?: boolean; tag?: string; tagCls?: string;
  parts: CardPart[];
  acts?: { t: string; cls?: string; icon?: string; act?: Action | Action[] }[]; actsCls?: string;
  fold?: { t: string; s?: string; cls?: string; act?: Action | Action[] }[];
  foot?: string; footIcon?: string; at?: string;
}
export type ChatMsg =
  | { k: 'sep'; t: string; anchor?: string }
  | { k: 'ban'; t: string; anchor?: string }
  | { k: 'me'; t: string }
  | { k: 'meF'; t: string; files: { name: string; meta: string }[] }
  | { k: 'typing'; t: string }
  | { k: 'ai'; t: string; meta?: string; metaIcon?: string }
  | { k: 'cards'; t?: string; cards: ChatCard[]; meta?: string; metaIcon?: string; anchor?: string };

export interface ActiveFlow { id: string; i: number; ans: Record<string, any>; done: boolean; cancelled: boolean; confirmedAt?: string; startedAt: string }

export interface Route { page: string; params?: Record<string, string> }

export interface DemoState {
  /* presentation */
  door: DoorId; w: Record<DoorId, number>; theme: 'light' | 'dark'; priv: boolean; ccy: Ccy; todaysMoney: boolean;
  viewer: MemberId; signedIn: boolean; route: Route; history: Route[]; chatOpen: boolean;
  /* the household, on one clock */
  clock: ClockId; time: string;
  assets: Asset[]; debts: Debt[];
  audit: AuditRow[]; runs: Run[]; files: FileRec[];
  checkIns: { id: string; when: string; what: string; record: string; asks?: string; status: string; [k: string]: any }[];
  plans: any[]; projection: { run: string; assumptions: Record<string, number>; [k: string]: any };
  admin: any; settings: any; members: any[];
  /** event ids applied, canonical or not, in order */
  applied: string[];
  /** free per-area state (each area writes only its own key) */
  area: Record<string, any>;
  /* the chat */
  chat: { history: ChatMsg[]; active: ActiveFlow | null; live: ChatMsg[]; typed: string; pendingFiles: { name: string; meta: string }[] };
  /* walk and branches */
  presenter: { on: boolean; step: number; done: number[] };
  branch: { name: string; base: Omit<DemoState, 'branch'> } | null;
  toast: { t: string; at: number } | null;
  undo: { label: string; acts: Action[] } | null;
  seq: number;
}
