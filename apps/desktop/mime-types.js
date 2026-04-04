/* =========================================================
   Lightweight MIME type lookup for supported file formats.
   No external dependencies.
   ========================================================= */

const path = require("path");

const MIME_MAP = {
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".mdown": "text/markdown",
  ".mkd": "text/markdown",
  ".txt": "text/plain",
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".html": "text/html",
  ".htm": "text/html",
  ".csv": "text/csv",
  ".json": "application/json",
  ".xml": "application/xml",
  ".rtf": "application/rtf",
  ".rst": "text/x-rst",
  ".tex": "application/x-tex",
  ".latex": "application/x-latex",
};

function mime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

module.exports = { mime, MIME_MAP };
