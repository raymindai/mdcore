"use client";

// /{id} re-renders the home (editor) page so that browser refresh on URLs like
// `localhost:3003/X31ZHoEn` (set by editor's history.replaceState) doesn't 404.
// The editor handles loading the doc by `id` from the URL.
export { default } from "../page";
