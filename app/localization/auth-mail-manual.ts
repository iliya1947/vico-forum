import type { UiKey } from "./catalog";
import type { TranslationPack } from "./sources";

// Fixed review fingerprints; changing source text requires reviewing these copies again.
const reviewedAuthMailFingerprints = {
  authMailVerifySubject: "25a89991577e3a37c0774413fb3aa19851989d40e935ac806e91a083399f3122",
  authMailVerifyBody: "693303404a3a4013b01dad8751149799a4f29c6efe189e056a6518fd84bb3b26",
  authMailVerifyAction: "c63dca8f7a3557ee64753a67858b86409da44db6882c67ccf1f69f065d3b85ad",
  authMailResetSubject: "dce1b803de489d76896fd0c881d6758e24e9e4b1a4f6f9f8213492c80b03d5ad",
  authMailResetBody: "9c3f08830661dcae62cbc5600d01fe605ff2707f3f6b5ae731eeb0679ce0c771",
  authMailResetAction: "00be5ea627dbe1939b3a2ed125ad20dc259e692018206f57e75071cbff91c638",
  authMailCreateSubject: "1d2f01e453c6ae37dd32a32bfab70c4151960db204e1135b4a6ade31f6c57d62",
  authMailCreateBody: "1fcc58c77fb5408ee7d668ac95713cb0cdd834b9bbd601e81a42da8587ad9164",
  authMailCreateAction: "cdc574ce65e6d62aa3f559340ea2375f0e8e2b20d378d30161d431edf5699c54",
  authMailChangeConfirmSubject: "b6a1691514fb640f3c7080030f96c190b4ac3c2395914071d3e589112164761e",
  authMailChangeConfirmBody: "c62d6b126cdde2f41740d5dc3cfed4cf34d952a88512b016d6fb09c40a844b4b",
  authMailChangeConfirmAction: "b07f29a25e03b0705eb793b0b1df40e88f14d71843c385bc7a2cb98f05582f17",
  authMailChangeVerifySubject: "641a12421f448035a94704b7d610548235a53e93b32eda345907f343187001cb",
  authMailChangeVerifyBody: "15a55f5bf971e3903f1e0a1323a63781f62b54b4735a3839d07ee827a65b4abf",
  authMailChangeVerifyAction: "916a620b06cef187cb716dc14a22227779a0937c5c6a85eb18d4327e7bf2e1f5",
  authMailIgnore: "86844ad5742ee7f5f011c24df41dd451d3229c1d200bff51f315e66d63d9bb95",
  authMailLink: "2ac22b180f4474f715ad85f6a866b23456d60c0629f1da40d01d8e49d37859a4",
} as const satisfies Record<UiKey<"authMail">, string>;

const values = {
  ru: {
    authMailVerifySubject: "Подтвердите email",
    authMailVerifyBody: "Подтвердите этот адрес для своего аккаунта Vico Forum.",
    authMailVerifyAction: "Подтвердить email",
    authMailResetSubject: "Восстановление пароля",
    authMailResetBody: "Перейдите по ссылке, чтобы задать новый пароль аккаунта Vico Forum.",
    authMailResetAction: "Задать новый пароль",
    authMailCreateSubject: "Добавление пароля",
    authMailCreateBody: "Подтвердите добавление пароля к своему аккаунту Vico Forum.",
    authMailCreateAction: "Продолжить добавление пароля",
    authMailChangeConfirmSubject: "Подтвердите смену email",
    authMailChangeConfirmBody: "Подтвердите, что вы запросили смену адреса своего аккаунта Vico Forum.",
    authMailChangeConfirmAction: "Подтвердить смену адреса",
    authMailChangeVerifySubject: "Подтвердите новый email",
    authMailChangeVerifyBody: "Подтвердите новый адрес для своего аккаунта Vico Forum.",
    authMailChangeVerifyAction: "Подтвердить новый адрес",
    authMailIgnore: "Если вы не отправляли этот запрос, проигнорируйте письмо.",
    authMailLink: "Также можно открыть ссылку:",
  },
  he: {
    authMailVerifySubject: "אימות כתובת הדוא״ל",
    authMailVerifyBody: "אמתו את כתובת הדוא״ל של חשבון Vico Forum שלכם.",
    authMailVerifyAction: "אימות הדוא״ל",
    authMailResetSubject: "איפוס סיסמה",
    authMailResetBody: "השתמשו בקישור לבחירת סיסמה חדשה לחשבון Vico Forum שלכם.",
    authMailResetAction: "איפוס הסיסמה",
    authMailCreateSubject: "הוספת סיסמה",
    authMailCreateBody: "אשרו את הבקשה להוסיף סיסמה לחשבון Vico Forum שלכם.",
    authMailCreateAction: "המשך הוספת סיסמה",
    authMailChangeConfirmSubject: "אישור שינוי כתובת הדוא״ל",
    authMailChangeConfirmBody: "אשרו שביקשתם לשנות את כתובת הדוא״ל בחשבון Vico Forum שלכם.",
    authMailChangeConfirmAction: "אישור שינוי הכתובת",
    authMailChangeVerifySubject: "אימות כתובת הדוא״ל החדשה",
    authMailChangeVerifyBody: "אמתו כתובת דוא״ל חדשה זו עבור חשבון Vico Forum שלכם.",
    authMailChangeVerifyAction: "אימות הכתובת החדשה",
    authMailIgnore: "אם לא ביקשתם זאת, אפשר להתעלם מהודעה זו.",
    authMailLink: "אפשר גם לפתוח קישור זה:",
  },
} as const satisfies Record<string, Record<UiKey<"authMail">, string>>;

export const authMailManualPacks: Readonly<Record<string, TranslationPack>> = Object.fromEntries(
  Object.entries(values).map(([locale, messages]) => [locale, {
    authMail: Object.fromEntries(Object.entries(messages).map(([key, value]) => [key, {
      value, sourceFingerprint: reviewedAuthMailFingerprints[key as UiKey<"authMail">],
    }])),
  }]),
);
