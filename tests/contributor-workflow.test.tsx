import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ContributePage from "../app/(site)/contribute/page";
import { contributorTasks } from "../content/contributor-tasks";
import { starterResources } from "../content/starter-resources";

test("published class and dungeon review tasks no longer require private drafts", (): void => {
  for (const id of ["class-review", "dungeon-review"]) {
    const task = contributorTasks.find((entry) => entry.id === id);
    assert(task);
    assert.match(task.steps[0], /published/);
    assert.doesNotMatch(
      task.steps.join("\n"),
      /Ask a maintainer.*draft|before publishing/,
    );
    assert.match(task.steps.join("\n"), /not tested|remains untested/);
  }
  const dungeon = contributorTasks.find(
    (entry) => entry.id === "dungeon-review",
  )!;
  assert(
    starterResources.some(
      (guide) => dungeon.target === `/guides/${guide.slug}`,
    ),
  );
  assert.match(
    contributorTasks
      .find((entry) => entry.id === "class-review")!
      .steps.join("\n"),
    /simulation-backed DPS guides/,
  );
});

test("member testing covers plan preservation, channel permissions and safe sign-in reporting", (): void => {
  const task = contributorTasks.find((entry) => entry.id === "organizer")!;
  const steps = task.steps.join("\n");
  for (const required of [
    "Host this plan",
    "Discord account",
    "capacity survive sign-in",
    "no Discord channel picker",
    "Stop before submitting",
    "never cookies, OAuth callback URLs",
  ]) {
    assert(steps.includes(required), required);
  }
  const html = renderToStaticMarkup(<ContributePage />);
  assert(html.includes("Check the member-to-host journey"));
  assert(html.includes("Open dungeon preparation"));
  assert(!html.includes("Ask a maintainer for the"));
  assert(
    html.includes("Ordinary channels and report forums are member-readable"),
  );
});
