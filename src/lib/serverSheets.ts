import fs from 'fs';
import path from 'path';

export interface ServerSheetsConfig {
  webAppUrl: string;
  driveFolderName: string;
  autoSync: boolean;
  syncIntervalSeconds: number;
  lastSyncedAt?: string;
}

const SHEETS_CONFIG_PATH = path.resolve(process.cwd(), 'data/sheets_config.json');

export function loadSheetsConfig(): ServerSheetsConfig {
  try {
    if (fs.existsSync(SHEETS_CONFIG_PATH)) {
      const raw = fs.readFileSync(SHEETS_CONFIG_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading sheets config:', e);
  }
  return {
    webAppUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
    driveFolderName: 'PatasNet_Drive',
    autoSync: true,
    syncIntervalSeconds: 4,
  };
}

export function saveSheetsConfig(config: Partial<ServerSheetsConfig>): ServerSheetsConfig {
  const current = loadSheetsConfig();
  const updated: ServerSheetsConfig = {
    ...current,
    ...config,
    webAppUrl: (config.webAppUrl !== undefined ? config.webAppUrl : current.webAppUrl).trim(),
  };

  try {
    const dir = path.dirname(SHEETS_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SHEETS_CONFIG_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error saving sheets config:', e);
  }

  return updated;
}

export async function syncSheetsWebhook(action: string, payload: any): Promise<any> {
  const cfg = loadSheetsConfig();
  if (!cfg.webAppUrl) return null;

  try {
    const response = await fetch(cfg.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
    });
    if (response.ok) {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return { status: 'success', raw: text };
      }
    }
  } catch (err: any) {
    console.warn(`[Google Sheets & Drive Webhook Sync (${action}) Error]:`, err.message || err);
  }
  return null;
}

export async function fetchFromGoogleSheetsServer(): Promise<any> {
  const cfg = loadSheetsConfig();
  if (!cfg.webAppUrl) return null;

  try {
    const response = await fetch(cfg.webAppUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow',
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (err: any) {
    console.warn('[Google Sheets & Drive Webhook Fetch Error]:', err.message || err);
  }
  return null;
}
