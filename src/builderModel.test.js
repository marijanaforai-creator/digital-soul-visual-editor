import test from "node:test";
import assert from "node:assert/strict";
import { BLOCK_TYPES, findSelectedBlock, makeBlock, makeProject, validateProject } from "./builderModel.js";

test("starter project has ten named, separately identified pages", () => {
  const project = makeProject();
  assert.equal(project.pages.length, 10);
  assert.deepEqual(project.pages.map(page => page.title), ["Početna", "Biblioteka rešenja", "Blog", "Besplatni sadržaj", "Individualna saradnja", "AI alati", "Svi proizvodi", "Sistem", "O meni", "Česta pitanja"]);
  assert.equal(new Set(project.pages.map(page => page.id)).size, 10);
  assert.equal(project.pages.filter(page => page.isHome).length, 1);
  assert.equal(new Set(project.pages.map(page => page.blocks[0].id)).size, 10);
});

test("block library covers the requested editor categories", () => {
  assert.equal(BLOCK_TYPES.length, 16);
  assert.ok(BLOCK_TYPES.some(([type]) => type === "faq"));
  assert.ok(BLOCK_TYPES.some(([type]) => type === "contact"));
});

test("project validator sanitizes style values and keeps page content independent", () => {
  const project = makeProject();
  project.pages[0].blocks[0].content.title = "Naslov samo početne";
  project.pages[0].blocks[0].style.background = "url(https://bad.example/image)";
  project.pages[0].blocks[0].style.padding = 900;
  const parsed = validateProject(JSON.parse(JSON.stringify(project)));
  assert.equal(parsed.pages[0].blocks[0].content.title, "Naslov samo početne");
  assert.equal(parsed.pages[1].blocks[0].content.title, "Biblioteka rešenja");
  assert.equal(parsed.pages[0].blocks[0].style.background, "#f7f3eb");
  assert.equal(parsed.pages[0].blocks[0].style.padding, 80);
});

test("project import preserves intentional zero spacing, padding, and radius", () => {
  const project = makeProject();
  Object.assign(project.pages[0].blocks[0].style, { spacing: 0, padding: 0, radius: 0 });
  const parsed = validateProject(JSON.parse(JSON.stringify(project)));
  assert.equal(parsed.pages[0].blocks[0].style.spacing, 0);
  assert.equal(parsed.pages[0].blocks[0].style.padding, 0);
  assert.equal(parsed.pages[0].blocks[0].style.radius, 0);
});

test("import rejects malformed pages and image payloads", () => {
  const project = makeProject();
  project.pages.pop();
  project.pages[0].isHome = false;
  assert.throws(() => validateProject(project), /tačno jednu početnu/);
  const imageProject = makeProject();
  imageProject.media = [{ id: "image-1", name: "bad.svg", dataUrl: "data:image/svg+xml;base64,AAAA" }];
  assert.throws(() => validateProject(imageProject), /neispravna ili veća/);
});

test("new blocks get stable ids and independent content values", () => {
  const first = makeBlock("text");
  const second = makeBlock("text");
  assert.notEqual(first.id, second.id);
  first.content.title = "Promenjen naslov";
  assert.notEqual(first.content.title, second.content.title);
});

test("selected block id resolves the block and the properties shown by the inspector", () => {
  const project = makeProject();
  const page = project.pages[0];
  const block = page.blocks[0];
  const selected = findSelectedBlock(page, block.id);

  assert.equal(selected, block);
  assert.equal(selected.type, "hero");
  assert.equal(selected.content.title, "Početna");
  assert.equal(selected.style.width, "wide");
  assert.equal(findSelectedBlock(project.pages[1], block.id), null);
  assert.equal(findSelectedBlock(page, "missing-block"), null);
});
