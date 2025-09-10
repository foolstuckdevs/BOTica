import chromium from '@sparticuz/chromium';
import puppeteer, { Browser, LaunchOptions } from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

// Launch headless Chromium with serverless (Linux) or local developer (Windows/macOS) fallbacks.
export async function launchBrowser(
  extraOpts: LaunchOptions = {},
): Promise<Browser> {
  const isServerless = !!(
    process.env.VERCEL ||
    process.env.AWS_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_VERSION
  );
  let executablePath: string | undefined;
  let args: string[] = [];

  if (isServerless) {
    executablePath = await chromium.executablePath();
    args = chromium.args;
  } else {
    // Local dev: try system Chrome / Edge installations (Windows focused)
    if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || '';
      const candidates = [
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        path.join(localAppData, 'Google/Chrome/Application/chrome.exe'),
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
      ].filter(Boolean) as string[];
      executablePath = candidates.find((p) => p && fs.existsSync(p));
    }
    // macOS paths (future-proof)
    if (!executablePath && process.platform === 'darwin') {
      const candidates = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      ];
      executablePath = candidates.find((p) => fs.existsSync(p));
    }
    // Linux (dev) common path
    if (!executablePath && process.platform === 'linux') {
      const candidates = [
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
      ];
      executablePath = candidates.find((p) => fs.existsSync(p));
    }
    // If none found, final fallback to @sparticuz/chromium (may fail on Windows) but attempt anyway
    if (!executablePath) {
      try {
        executablePath = await chromium.executablePath();
        args = chromium.args;
      } catch {
        throw new Error(
          'Unable to locate a Chrome/Chromium executable. Set CHROME_EXECUTABLE_PATH env variable.',
        );
      }
    }
  }

  const launchOptions: LaunchOptions = {
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-dev-tools',
      ...args,
    ],
    defaultViewport: { width: 1280, height: 800 },
    ...extraOpts,
  };

  return puppeteer.launch(launchOptions);
}
