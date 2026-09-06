export const THEME_COOKIE = "patrimonio-theme";

export type Theme = "light" | "dark";

export function parseTheme(value: string | null | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}
