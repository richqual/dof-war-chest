// Phase 1 — minimal Google Sheets client for the player-master pipeline.
//
// Uses google-auth-library (already in the tree via firebase) + the Sheets v4
// REST API over fetch, so no heavy `googleapis` dependency is added. Auth is a
// service account: set GOOGLE_SHEETS_KEY_FILE (or GOOGLE_APPLICATION_CREDENTIALS)
// to the path of its JSON key, and share the sheet with the service account's
// email (Viewer for export, Editor for populate). See scripts/phase1/README.md.
import { GoogleAuth } from "google-auth-library";

export const SPREADSHEET_ID = "1US8-r3Dh9QmPnQHMgWKhLqOM5ijpKES9bcs2fNAVHZ0";
export const TAB = "players";

async function token() {
  const keyFile = process.env.GOOGLE_SHEETS_KEY_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyFile) {
    throw new Error(
      "No service-account key. Set GOOGLE_SHEETS_KEY_FILE to its JSON path and share\n" +
      "the sheet with the service account. See scripts/phase1/README.md."
    );
  }
  const auth = new GoogleAuth({ keyFile, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

const base = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

export async function getValues(range) {
  const t = await token();
  const res = await fetch(`${base}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!res.ok) throw new Error(`Sheets GET ${range}: HTTP ${res.status} ${await res.text()}`);
  return (await res.json()).values || [];
}

// Overwrite a range with `values` (a 2-D array), RAW (no formula/locale parsing).
export async function updateValues(range, values) {
  const t = await token();
  const res = await fetch(
    `${base}/values/${encodeURIComponent(range)}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    }
  );
  if (!res.ok) throw new Error(`Sheets PUT ${range}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}
