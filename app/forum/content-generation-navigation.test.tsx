import { cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryRouter,
  RouterProvider,
  useLoaderData,
  type ActionFunctionArgs,
} from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import {
  ContentGenerationNavigationBoundary,
  ContentGenerationUnitStatus,
} from "./content-generation-controls";
import type { ContentGenerationUnitView } from "../localization/content-generation-view";
import type { ContentGenerationActionResponse } from "../localization/content-generation-response";

type PageData = {
  locale: string;
  topicId: string;
  units: readonly ContentGenerationUnitView[];
};

function pageUnit(locale: string, topicId: string): ContentGenerationUnitView {
  const contentId = `post-${topicId}`;
  return {
    key: JSON.stringify(["post-body", contentId, `${contentId}-r1`, locale]),
    contentType: "post-body",
    contentId,
    revisionId: `${contentId}-r1`,
    targetLocale: locale,
    state: "idle",
    automatic: true,
    explicitRequired: false,
  };
}

function TestPage() {
  const data = useLoaderData() as PageData;
  return (
    <ContentGenerationNavigationBoundary
      pageIdentity={JSON.stringify([data.locale, data.topicId])}
      units={data.units}
    >
      {data.units.map((unit) => (
        <ContentGenerationUnitStatus key={unit.key} unit={unit} />
      ))}
    </ContentGenerationNavigationBoundary>
  );
}

function createRouter(
  action: (args: ActionFunctionArgs) => Promise<ContentGenerationActionResponse>,
) {
  return createMemoryRouter([{
    path: "/:locale/topics/:topicId",
    loader: ({ params }) => {
      const locale = params.locale ?? "en";
      const topicId = params.topicId ?? "";
      return {
        locale,
        topicId,
        units: [pageUnit(locale, topicId)],
      } satisfies PageData;
    },
    action,
    Component: TestPage,
  }], {
    initialEntries: ["/he/topics/topic-1"],
  });
}

afterEach(() => {
  cleanup();
});

describe("content generation router navigation lifecycle", () => {
  it("starts a fresh automatic snapshot on topic and locale navigation but not same-location revalidation", async () => {
    const submissions: string[] = [];
    const router = createRouter(async ({ request, params }) => {
      const formData = await request.formData();
      submissions.push(`${params.locale}:${params.topicId}:${String(formData.get("postId"))}`);
      return { operation: "contentGeneration", outcome: "queued" };
    });

    render(<RouterProvider router={router} />);

    await waitFor(() => expect(submissions).toEqual(["he:topic-1:post-topic-1"]));

    await router.revalidate();
    await waitFor(() => expect(router.state.revalidation).toBe("idle"));
    expect(submissions).toEqual(["he:topic-1:post-topic-1"]);

    await router.navigate("/he/topics/topic-2");
    await waitFor(() => expect(submissions).toEqual([
      "he:topic-1:post-topic-1",
      "he:topic-2:post-topic-2",
    ]));

    await router.navigate("/ru/topics/topic-2");
    await waitFor(() => expect(submissions).toEqual([
      "he:topic-1:post-topic-1",
      "he:topic-2:post-topic-2",
      "ru:topic-2:post-topic-2",
    ]));
  });

  it("does not attach an old page in-flight result to the newly navigated page", async () => {
    const pending = new Map<string, {
      resolve: (response: ContentGenerationActionResponse) => void;
      promise: Promise<ContentGenerationActionResponse>;
    }>();
    const submissions: string[] = [];

    const router = createRouter(async ({ request, params }) => {
      const formData = await request.formData();
      const identity = `${params.locale}:${params.topicId}:${String(formData.get("postId"))}`;
      submissions.push(identity);
      let resolve!: (response: ContentGenerationActionResponse) => void;
      const promise = new Promise<ContentGenerationActionResponse>((complete) => {
        resolve = complete;
      });
      pending.set(identity, { resolve, promise });
      return promise;
    });

    render(<RouterProvider router={router} />);

    await waitFor(() => expect(submissions).toEqual(["he:topic-1:post-topic-1"]));
    expect(screen.queryByText("translationRequesting")).not.toBeNull();

    await router.navigate("/he/topics/topic-2");
    await waitFor(() => expect(submissions).toEqual([
      "he:topic-1:post-topic-1",
      "he:topic-2:post-topic-2",
    ]));

    pending.get("he:topic-1:post-topic-1")!.resolve({
      operation: "contentGeneration",
      outcome: "unavailable",
    });
    await Promise.resolve();
    expect(screen.queryByText("translationUnavailable")).toBeNull();
    expect(screen.queryByText("translationRequesting")).not.toBeNull();

    pending.get("he:topic-2:post-topic-2")!.resolve({
      operation: "contentGeneration",
      outcome: "queued",
    });
    await waitFor(() => expect(screen.queryByText("translationPending")).not.toBeNull());
  });
});
