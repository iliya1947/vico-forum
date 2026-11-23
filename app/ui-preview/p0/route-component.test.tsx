// @vitest-environment jsdom
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, Form, Outlet, RouterProvider } from "react-router";
import type { PreviewRouteDescriptor } from "../build/route-manifest";
import { createPreviewDataRoutes } from "./route-adapter";

afterEach(cleanup);

const manifest: PreviewRouteDescriptor = {
  id: "root", file: "root.tsx", children: [{
    id: "routes/locale-boundary", file: "routes/locale-boundary.tsx", path: ":locale",
    children: [{
      id: "routes/topic", file: "routes/topic.tsx", path: "topics/:topicId",
    }],
  }],
};

const Shell = () => createElement(Outlet);

function Topic({
  loaderData, actionData, params, matches,
}: {
  loaderData: unknown;
  actionData: unknown;
  params: unknown;
  matches: Array<{ id: string; loaderData: unknown; handle?: unknown }>;
}) {
  const snapshot = {
    loaderData, actionData, params,
    matches: matches.map(({ id, loaderData, handle }) => ({ id, loaderData, handle })),
  };
  return createElement("main", null,
    createElement("output", { "data-testid": "framework-props" }, JSON.stringify(snapshot)),
    createElement(Form, { method: "post" },
      createElement("input", { name: "intent", type: "hidden", value: "reply" }),
      createElement("button", { type: "submit" }, "Reply"),
    ),
  );
}

function snapshot() {
  const value = screen.getByTestId("framework-props").textContent;
  if (!value) throw new Error("Missing component props");
  return JSON.parse(value) as {
    loaderData: unknown;
    actionData?: unknown;
    params: { locale: string; topicId: string };
    matches: Array<{ id: string; loaderData: unknown; handle?: unknown }>;
  };
}

describe("generic Framework component props in the preview Data Router", () => {
  it("passes loaderData/params/matches, then actionData through the real router action", async () => {
    const modules = new Map<string, Record<string, unknown>>([
      ["root", { default: Shell }],
      ["routes/locale-boundary", {
        default: Shell,
        loader: () => ({ translationLocale: "he" }),
        handle: { area: "locale" },
      }],
      ["routes/topic", {
        default: Topic,
        loader: ({ params }: { params: { topicId: string } }) => ({ topicId: params.topicId }),
        action: async ({ request }: { request: Request }) => ({
          accepted: (await request.formData()).get("intent") === "reply",
        }),
      }],
    ]);
    const router = createMemoryRouter(createPreviewDataRoutes(manifest, modules), {
      initialEntries: ["/he/topics/topic-1"],
    });
    try {
      render(createElement(RouterProvider, { router }));
      await screen.findByTestId("framework-props");
      expect(snapshot().loaderData).toEqual({ topicId: "topic-1" });
      expect(snapshot().params).toEqual({ locale: "he", topicId: "topic-1" });
      expect(snapshot().matches.map(({ id }) => id))
        .toEqual(["root", "routes/locale-boundary", "routes/topic"]);
      expect(snapshot().matches[1]).toEqual({
        id: "routes/locale-boundary",
        loaderData: { translationLocale: "he" },
        handle: { area: "locale" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Reply" }));
      await waitFor(() => expect(snapshot().actionData).toEqual({ accepted: true }));
      expect(snapshot().loaderData).toEqual({ topicId: "topic-1" });
    } finally {
      router.dispose();
    }
  });
});
