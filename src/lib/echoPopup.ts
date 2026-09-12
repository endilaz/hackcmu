import type { Echo } from "../types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const echoDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** HTML content for a Leaflet popup that re-shows a saved Echo. */
export function echoPopupHtml(echo: Echo): string {
  const trimmed = echo.text.trim();
  const text = trimmed
    ? `<p class="echo-popup__text">${escapeHtml(trimmed)}</p>`
    : `<p class="echo-popup__text echo-popup__text--empty">No message left</p>`;
  const photo =
    echo.photo && echo.photo.startsWith("data:image/")
      ? `<img class="echo-popup__photo" src="${echo.photo}" alt="" />`
      : "";

  return [
    `<div class="echo-popup">`,
    `<span class="echo-popup__mood">Echo · ${escapeHtml(echo.mood)}</span>`,
    text,
    photo,
    `<time class="echo-popup__when">${escapeHtml(echoDateFormatter.format(new Date(echo.createdAt)))}</time>`,
    `</div>`,
  ].join("");
}
