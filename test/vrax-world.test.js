const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.join(__dirname, "..", "packages", "vrax-world", "src");
const load = (rel) => import(pathToFileURL(path.join(root, rel)).href);

let interpret;
let buildWorld, createState, step, applyAction, outdoorCount, waitingCount, unreachableCount;

before(async () => {
  ({ interpret } = await load("interpreter.js"));
  ({ buildWorld } = await load("world/world.js"));
  ({ createState } = await load("sim/state.js"));
  ({ step } = await load("sim/step.js"));
  ({ applyAction } = await load("sim/actions.js"));
  ({ outdoorCount } = await load("sim/people.js"));
  ({ waitingCount, unreachableCount } = await load("sim/vehicles.js"));
});

const acts = (text, ctx) => interpret(text, ctx).actions;

describe("vrax-world interpreter (English)", () => {
  it("reads weather, time and season", () => {
    assert.deepEqual(acts("make it rain"), [{ type: "weather", value: "rain" }]);
    assert.deepEqual(acts("Make it snow"), [{ type: "weather", value: "snow" }]);
    assert.deepEqual(acts("stop the rain"), [{ type: "weather", value: "clear" }]);
    assert.deepEqual(acts("rainy night"), [{ type: "weather", value: "rain" }, { type: "time", value: "night" }]);
    assert.deepEqual(acts("make it autumn"), [{ type: "season", value: "autumn" }]);
    assert.deepEqual(acts("at 7:30 pm"), [{ type: "time", clock: 19 * 60 + 30 }]);
  });

  it("reads river amounts, relative and absolute", () => {
    assert.deepEqual(acts("raise the river by 50 cm"), [{ type: "river", mode: "delta", value: 0.5 }]);
    assert.deepEqual(acts("raise the river to 2 m"), [{ type: "river", mode: "set", value: 2 }]);
    assert.deepEqual(acts("return the river to normal"), [{ type: "river", mode: "set", value: 0 }]);
    assert.deepEqual(acts("flood the city"), [{ type: "river", mode: "set", value: 2.5 }]);
  });

  it("handles bridges, references and questions", () => {
    assert.deepEqual(acts("close the north bridge"), [{ type: "bridge", id: "north", closed: true }]);
    assert.deepEqual(acts("close north and south bridges"), [{ type: "bridge", id: "both", closed: true }]);
    assert.deepEqual(acts("reopen it", { last: { kind: "bridge", id: "north" } }), [{ type: "bridge", id: "north", closed: false }]);
    assert.deepEqual(acts("close this", { selected: "bridge-south" }), [{ type: "bridge", id: "south", closed: true }]);
    const r = interpret("close the bridge");
    assert.equal(r.actions.length, 0);
    assert.equal(r.ask.key, "ask.bridgeWhich");
    assert.equal(r.ask.options.length, 3);
  });

  it("keeps separate clauses apart", () => {
    assert.deepEqual(acts("close the north bridge and lower the river"), [
      { type: "bridge", id: "north", closed: true },
      { type: "river", mode: "delta", value: -0.5 },
    ]);
  });

  it("finds targets for emergencies", () => {
    assert.deepEqual(acts("Set the school on fire"), [{ type: "fire", target: "school" }]);
    assert.deepEqual(acts("set the fire station on fire"), [{ type: "fire", target: "fire-station" }]);
    assert.deepEqual(acts("burn it", { selected: "cinema" }), [{ type: "fire", target: "cinema" }]);
    assert.deepEqual(acts("put out the fire"), [{ type: "extinguish" }]);
    assert.deepEqual(acts("Rob the bank"), [{ type: "robbery" }]);
    assert.equal(interpret("burn").ask.key, "ask.fireWhere");
  });

  it("says no to things outside the sandbox", () => {
    const r = interpret("earthquake");
    assert.equal(r.actions.length, 0);
    assert.equal(r.replies[0].key, "reply.disaster");
    assert.deepEqual(acts("tornado"), [{ type: "weather", value: "storm" }]);
    assert.equal(interpret("what is the meaning of life").replies[0].key, "reply.unknown");
  });
});

describe("vrax-world interpreter (Bahasa Indonesia)", () => {
  it("understands everyday Indonesian", () => {
    assert.deepEqual(acts("bikin hujan dong"), [{ type: "weather", value: "rain" }]);
    assert.deepEqual(acts("hentikan hujan"), [{ type: "weather", value: "clear" }]);
    assert.deepEqual(acts("hujan badai"), [{ type: "weather", value: "storm" }]);
    assert.deepEqual(acts("mati lampu"), [{ type: "blackout", on: true }]);
    assert.deepEqual(acts("nyalakan listrik"), [{ type: "blackout", on: false }]);
    assert.deepEqual(acts("macet"), [{ type: "rush", on: true }]);
    assert.deepEqual(acts("kembang api"), [{ type: "fireworks" }]);
    assert.equal(interpret("bikin hujan dong").lang, "id");
  });

  it("reads Indonesian amounts, clock times and places", () => {
    assert.deepEqual(acts("naikkan sungai 1 meter"), [{ type: "river", mode: "delta", value: 1 }]);
    assert.deepEqual(acts("turunkan air sungai setengah meter"), [{ type: "river", mode: "delta", value: -0.5 }]);
    assert.deepEqual(acts("jam 8 malam"), [{ type: "time", clock: 20 * 60 }]);
    assert.deepEqual(acts("bakar gudang tua"), [{ type: "fire", target: "warehouse" }]);
    assert.deepEqual(acts("kebakaran di rumah sakit"), [{ type: "fire", target: "hospital" }]);
    assert.deepEqual(acts("ubah parkiran jadi taman"), [{ type: "parking", park: true }]);
  });

  it("combines clauses joined with dan", () => {
    assert.deepEqual(acts("tutup jembatan utara dan bikin malam"), [
      { type: "bridge", id: "north", closed: true },
      { type: "time", value: "night" },
    ]);
    assert.deepEqual(acts("pasar malam"), [{ type: "festival", on: true }, { type: "time", value: "night" }]);
    assert.deepEqual(acts("buka lagi", { last: { kind: "bridge", id: "south" } }), [{ type: "bridge", id: "south", closed: false }]);
  });
});

describe("vrax-world simulation", () => {
  let world, state;
  const run = (seconds) => { for (let i = 0; i < Math.round(seconds * 30); i++) step(state, world, 1 / 30); };

  before(() => {
    world = buildWorld();
    state = createState(world, 7);
  });

  it("builds a connected city", () => {
    assert.equal(world.buildings.length, 46);
    assert.equal(world.roads.ends.length, 14);
    for (const b of world.buildings) assert.ok(b.id in world.roads.poiNode, `${b.id} has a curb stop`);
    assert.ok(state.people.length > 200);
    assert.ok(state.vehicles.length > 20);
    assert.ok(outdoorCount(state) > 50);
  });

  it("keeps everyday traffic moving (no gridlock)", () => {
    const s = createState(world, 20260924);
    for (let i = 0; i < 30 * 300; i++) step(s, world, 1 / 30);
    const stuck = s.vehicles.filter((v) => v.st === "drive" && v.waitT > 30);
    assert.equal(stuck.length, 0, `stuck vehicles: ${stuck.map((v) => v.id).join(",")}`);
    assert.ok(waitingCount(s) < 15, `waiting ${waitingCount(s)}`);
  });

  it("is deterministic for a seed", () => {
    const a = createState(world, 99);
    const b = createState(world, 99);
    for (let i = 0; i < 90; i++) { step(a, world, 1 / 30); step(b, world, 1 / 30); }
    assert.deepEqual(JSON.stringify(a), JSON.stringify(b));
  });

  it("reroutes and strands traffic when both bridges close", () => {
    run(5);
    const n = applyAction(state, world, { type: "bridge", id: "both", closed: true });
    assert.equal(n.kind, "bridge");
    run(25);
    assert.ok(unreachableCount(state) > 0, "some trips can no longer cross");
    assert.ok(waitingCount(state) >= 0);
    const same = applyAction(state, world, { type: "bridge", id: "north", closed: true });
    assert.equal(same.kind, "same");
    applyAction(state, world, { type: "bridge", id: "both", closed: false });
  });

  it("sends people indoors when it rains", () => {
    const before = outdoorCount(state);
    const n = applyAction(state, world, { type: "weather", value: "rain" });
    assert.equal(n.kind, "weather");
    run(40);
    assert.ok(outdoorCount(state) < before, `outdoors ${outdoorCount(state)} < ${before}`);
    applyAction(state, world, { type: "weather", value: "clear" });
  });

  it("puts out a fire and leaves the building damaged", () => {
    const n = applyAction(state, world, { type: "fire", target: "school" });
    assert.equal(n.kind, "fire");
    assert.ok(state.vehicles.some((v) => v.role === "fire"), "trucks dispatched");
    applyAction(state, world, { type: "extinguish" });
    run(20);
    assert.equal(state.fires.filter((f) => f.heat > 0).length, 0);
    assert.ok(state.charred.includes(world.buildingIndex.school));
  });

  it("plays out a robbery to an ending", () => {
    applyAction(state, world, { type: "robbery" });
    run(90);
    assert.ok(["over", "caught", "escaped"].includes(state.robbery.phase));
  });

  it("clamps the river and floods the banks", () => {
    const up = applyAction(state, world, { type: "river", mode: "delta", value: 9 });
    assert.equal(up.next, 2.5);
    assert.equal(applyAction(state, world, { type: "river", mode: "delta", value: 1 }).reason, "riverMax");
    run(3);
    applyAction(state, world, { type: "river", mode: "set", value: 0 });
    run(3);
    assert.ok(state.people.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z)));
    assert.ok(state.vehicles.every((v) => Number.isFinite(v.x) && Number.isFinite(v.z)));
  });

  it("snapshots restore exactly", () => {
    const snap = structuredClone(state);
    applyAction(state, world, { type: "festival", on: true });
    run(2);
    assert.notDeepEqual(state.festival, snap.festival);
    const restored = structuredClone(snap);
    assert.equal(restored.festival.on, snap.festival.on);
    assert.equal(restored.people.length, snap.people.length);
  });
});
