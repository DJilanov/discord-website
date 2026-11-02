import { test } from "node:test";
import assert from "node:assert/strict";
import { Children, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ErrorPage from "../app/error";

test("Release directories produce a valid stable Next.js deployment identifier", async () => {
  const previous = process.env.FOREVER_BUILD_DIR;
  try {
    process.env.FOREVER_BUILD_DIR = ".next-release-signup-recovery-20261008-r1";
    const { default: config } = await import("../next.config");
    assert.match(config.deploymentId ?? "", /^[a-f0-9]{20}$/);
    assert.equal(config.distDir, process.env.FOREVER_BUILD_DIR);
  } finally {
    if (previous === undefined) delete process.env.FOREVER_BUILD_DIR;
    else process.env.FOREVER_BUILD_DIR = previous;
  }
});

test("Page errors retry the server segment rather than resetting cached content", () => {
  let retries = 0;
  const retry = (): void => {
    retries += 1;
  };
  const page = ErrorPage({ error: new Error("private diagnostic"), retry });
  const actions = Children.toArray(page.props.children).find(
    (child) =>
      isValidElement<{ className?: string }>(child) &&
      child.props.className === "button-row",
  );
  assert.ok(isValidElement<{ children: ReactNode }>(actions));
  const buttons = Children.toArray(actions.props.children).filter(
    (child) => isValidElement(child) && child.type === "button",
  );
  assert.equal(buttons.length, 2);
  const button = buttons[0];
  assert.ok(isValidElement<{ onClick: () => void }>(button));
  assert.equal(button.props.onClick, retry);
  button.props.onClick();
  assert.equal(retries, 1);
  const html = renderToStaticMarkup(page);
  assert.match(html, /Reload page/);
  assert.doesNotMatch(html, /private diagnostic|not been changed/);
});
