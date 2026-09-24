import { describe, expect, it, vi } from "vitest";

import {
  ContentSourceLocaleResolver,
  ThresholdContentSourceLocalePolicy,
  type ContentSourceLocaleDetectionInput,
} from "./content-source-locale";
import type { ContentTranslationRevision } from "./content-translation";
import {
  TINYLD_DETECTOR_MODEL,
  TINYLD_DETECTOR_NAME,
  TINYLD_MINIMUM_NATIVE_SCORE,
  TINYLD_MINIMUM_SCORE_MARGIN,
  TinyLdContentSourceLocaleDetector,
  type TinyLdDetectAll,
} from "./tinyld-source-locale-detector";

function input(
  originalContent: string,
  contentType: ContentSourceLocaleDetectionInput["contentType"] = "topic-title",
): ContentSourceLocaleDetectionInput {
  return {
    contentType,
    contentId: contentType === "topic-title" ? "topic-1" : "post-1",
    revisionId: contentType === "topic-title" ? "topic-r1" : "post-r1",
    originalContent,
  };
}

describe("TinyLdContentSourceLocaleDetector", () => {
  it.each([
    [
      "ru",
      "Это достаточно длинный русский текст о программировании, разработке приложений и переводе сообщений на форуме.",
    ],
    [
      "he",
      "זהו טקסט עברי ארוך מספיק על תכנות, פיתוח יישומים ותרגום הודעות בפורום למשתמשים שונים.",
    ],
    [
      "en",
      "This is a sufficiently long English text about programming, application development, and translating forum messages.",
    ],
    [
      "ja",
      "これはプログラミングとアプリケーション開発について説明する十分に長い日本語の文章です。翻訳の確認にも使います。",
    ],
    [
      "ar",
      "هذا نص عربي طويل بما يكفي عن البرمجة وتطوير التطبيقات وترجمة رسائل المنتدى للمستخدمين المختلفين.",
    ],
  ])("detects %s with the pinned offline TinyLD model", async (locale, text) => {
    const detector = new TinyLdContentSourceLocaleDetector();

    await expect(detector.detect(input(text))).resolves.toMatchObject({
      locale,
      confidence: expect.any(Number),
      evidence: {
        origin: "detector",
        detector: TINYLD_DETECTOR_NAME,
        model: TINYLD_DETECTOR_MODEL,
      },
    });
  });

  it("treats the returned number as TinyLD native score evidence and applies the agreed gates", async () => {
    const accepted = new TinyLdContentSourceLocaleDetector(() => [
      { lang: "ru", accuracy: TINYLD_MINIMUM_NATIVE_SCORE },
      {
        lang: "uk",
        accuracy: TINYLD_MINIMUM_NATIVE_SCORE - TINYLD_MINIMUM_SCORE_MARGIN,
      },
    ]);

    await expect(accepted.detect(input(
      "Достаточно длинный русский текст для проверки границы нативного рейтинга TinyLD.",
    ))).resolves.toMatchObject({
      locale: "ru",
      confidence: TINYLD_MINIMUM_NATIVE_SCORE,
    });

    const lowTop = new TinyLdContentSourceLocaleDetector(() => [
      { lang: "ru", accuracy: TINYLD_MINIMUM_NATIVE_SCORE - 0.01 },
      { lang: "uk", accuracy: 0.10 },
    ]);
    await expect(lowTop.detect(input(
      "Достаточно длинный русский текст для проверки слишком низкого результата детектора.",
    ))).resolves.toBeUndefined();

    const lowMargin = new TinyLdContentSourceLocaleDetector(() => [
      { lang: "ru", accuracy: 0.90 },
      { lang: "uk", accuracy: 0.71 },
    ]);
    await expect(lowMargin.detect(input(
      "Достаточно длинный смешанный текст для проверки неоднозначного результата детектора.",
    ))).resolves.toBeUndefined();
  });

  it("uses the real global top candidate and never promotes a lower mapped candidate", async () => {
    const detector = new TinyLdContentSourceLocaleDetector(() => [
      { lang: "ber", accuracy: 0.97 },
      { lang: "ru", accuracy: 0.70 },
    ]);

    await expect(detector.detect(input(
      "Достаточно длинный текст, где тестовый global winner специально не имеет Vico mapping.",
    ))).resolves.toBeUndefined();
  });

  it.each([
    ["zh", "这是用于语言检测边界测试的足够长的中文文本内容，不能自动推断任何地区或书写系统。"],
    ["pt", "Este é um texto suficientemente longo para testar a deteção de idioma sem inferir nenhuma região específica."],
    ["sr", "Ово је довољно дугачак текст за проверу детекције језика без аутоматског додавања писма или региона."],
  ])("returns generic canonical %s without region or script inference", async (locale, text) => {
    const detector = new TinyLdContentSourceLocaleDetector(() => [
      { lang: locale, accuracy: 0.95 },
      { lang: "en", accuracy: 0.20 },
    ]);

    await expect(detector.detect(input(text))).resolves.toMatchObject({
      locale,
      confidence: 0.95,
    });
  });

  it("fails unresolved for Georgian because TinyLD 1.3.4 has no Georgian model", async () => {
    const run = vi.fn<TinyLdDetectAll>(() => [
      { lang: "ru", accuracy: 0.99 },
      { lang: "en", accuracy: 0.01 },
    ]);
    const detector = new TinyLdContentSourceLocaleDetector(run);

    await expect(detector.detect(input(
      "ეს არის საკმარისად გრძელი ქართული ტექსტი, რომელიც არ უნდა მიეწეროს სხვა ენას.",
    ))).resolves.toBeUndefined();
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects short and technical-only text before invoking TinyLD", async () => {
    const run = vi.fn<TinyLdDetectAll>(() => [
      { lang: "en", accuracy: 1 },
    ]);
    const detector = new TinyLdContentSourceLocaleDetector(run);

    await expect(detector.detect(input("Short human text."))).resolves.toBeUndefined();
    await expect(detector.detect(input(
      "https://example.com/docs fetchData() API_TOKEN --verbose",
    ))).resolves.toBeUndefined();
    await expect(detector.detect(input(
      `\`\`\`ts
const value = fetchData();
\`\`\`

<https://example.com/raw>

<div>hidden prose inside raw HTML</div>
`,
      "post-body",
    ))).resolves.toBeUndefined();

    expect(run).not.toHaveBeenCalled();
  });

  it("reuses CNT-04 semantic filtering for Markdown instead of feeding code, URLs, or raw HTML to TinyLD", async () => {
    const run = vi.fn<TinyLdDetectAll>(() => [
      { lang: "ru", accuracy: 0.96 },
      { lang: "uk", accuracy: 0.20 },
    ]);
    const detector = new TinyLdContentSourceLocaleDetector(run);
    const markdown = `Пожалуйста, переведите этот человеческий текст аккуратно и сохраните технические детали.

\`fetchData()\` и API_TOKEN должны остаться техническими.

https://example.com/docs

<div>этот raw HTML текст не должен участвовать</div>
`;

    await expect(detector.detect(input(markdown, "post-body"))).resolves.toMatchObject({
      locale: "ru",
    });

    expect(run).toHaveBeenCalledTimes(1);
    const semanticText = run.mock.calls[0]![0];
    expect(semanticText).toContain("Пожалуйста");
    expect(semanticText).toContain("должны остаться техническими");
    expect(semanticText).not.toContain("fetchData");
    expect(semanticText).not.toContain("API_TOKEN");
    expect(semanticText).not.toContain("example.com");
    expect(semanticText).not.toContain("raw HTML");
  });

  it("does not allow UI/request locale metadata to influence detection", async () => {
    const run = vi.fn<TinyLdDetectAll>(() => [
      { lang: "ru", accuracy: 0.96 },
      { lang: "uk", accuracy: 0.20 },
    ]);
    const detector = new TinyLdContentSourceLocaleDetector(run);
    const base = input(
      "Достаточно длинный русский текст для проверки независимости языка контента от языка интерфейса.",
    );
    const enriched = {
      ...base,
      uiLocale: "he",
      requestLocale: "en",
    };

    const first = await detector.detect(base);
    const second = await detector.detect(enriched);
    expect(second).toEqual(first);
    expect(run.mock.calls[0]![0]).toBe(run.mock.calls[1]![0]);
  });

  it("lets the existing resolver bypass TinyLD for a known immutable revision source", async () => {
    const failure = new Error("TinyLD must not run");
    const detector = new TinyLdContentSourceLocaleDetector(() => {
      throw failure;
    });
    const resolver = new ContentSourceLocaleResolver(
      detector,
      new ThresholdContentSourceLocalePolicy(0.8, () => true),
    );
    const revision: ContentTranslationRevision = {
      contentType: "post-body",
      contentId: "post-1",
      revisionId: "post-r1",
      originalContent: "Known source metadata bypasses detection.",
      sourceLocale: "ru",
    };

    await expect(resolver.resolve(revision)).resolves.toEqual({
      kind: "revision",
      mayProceed: true,
      sourceLocale: "ru",
      resolutionOrigin: "revision-metadata",
    });
  });

  it("propagates unexpected TinyLD/programming failures instead of classifying them as unavailable", async () => {
    const failure = new Error("TinyLD integration bug");
    const detector = new TinyLdContentSourceLocaleDetector(() => {
      throw failure;
    });

    await expect(detector.detect(input(
      "This is sufficiently long semantic text to reach the detector runner and expose the unexpected failure.",
    ))).rejects.toBe(failure);
  });

  it("rejects malformed TinyLD candidate scores instead of inventing detection semantics", async () => {
    const detector = new TinyLdContentSourceLocaleDetector(() => [
      { lang: "en", accuracy: Number.NaN },
    ]);

    await expect(detector.detect(input(
      "This is sufficiently long semantic text to exercise malformed local detector output validation.",
    ))).rejects.toBeInstanceOf(TypeError);
  });
});
