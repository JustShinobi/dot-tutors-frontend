import { describe, expect, it } from "vitest";

import { RESIZE_MESSAGE, isResizeMessage } from "./embed-messaging";

/**
 * This contract is public API for integrators: a host page pattern-matches on it. The guard is
 * tested against hostile and malformed input because `window.message` accepts anything any
 * frame decides to post.
 */
describe("isResizeMessage", () => {
  it("aceita a mensagem valida", () => {
    expect(isResizeMessage({ type: RESIZE_MESSAGE, height: 640, embedKey: "pk_live_x" })).toBe(
      true,
    );
  });

  it.each([
    ["outro tipo", { type: "outra-coisa", height: 640, embedKey: "pk" }],
    ["sem altura", { type: RESIZE_MESSAGE, embedKey: "pk" }],
    ["altura como texto", { type: RESIZE_MESSAGE, height: "640", embedKey: "pk" }],
    ["altura negativa", { type: RESIZE_MESSAGE, height: -1, embedKey: "pk" }],
    ["altura zero", { type: RESIZE_MESSAGE, height: 0, embedKey: "pk" }],
    ["altura infinita", { type: RESIZE_MESSAGE, height: Infinity, embedKey: "pk" }],
    ["altura NaN", { type: RESIZE_MESSAGE, height: NaN, embedKey: "pk" }],
    ["sem chave", { type: RESIZE_MESSAGE, height: 640 }],
    ["nulo", null],
    ["texto solto", "dot-tutor:resize"],
    ["numero", 42],
  ])("rejeita %s", (_caso, payload) => {
    expect(isResizeMessage(payload)).toBe(false);
  });
});
