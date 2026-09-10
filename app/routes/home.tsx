import { useTranslation } from "react-i18next";

export function meta() {
  return [{ title: "Vico Forum" }];
}

export default function Home() {
  const { t } = useTranslation("common");
  return (
    <main className="shell">
      <p className="eyebrow">{t("productName")}</p>
      <h1>{t("heading")}</h1>
      <p>{t("stageSummary")}</p>
    </main>
  );
}
