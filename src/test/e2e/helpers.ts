import { text } from 'node:stream/consumers';

import { waitForHydration } from '@nuxt/test-utils/e2e';
import type { Locator, Page } from '@playwright/test';

import { credentials, expect } from './fixtures';

export async function goto(page: Page, url: string) {
  await page.goto(url);
  await waitForHydration(page, url, 'hydration');
}

export async function reload(page: Page) {
  await page.reload();
  await waitForHydration(page, page.url(), 'hydration');
}

export async function login(page: Page, url = '/login') {
  await goto(page, url);
  await page.getByLabel('Username', { exact: true }).fill(credentials.username);
  await page.getByLabel('Password', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Clients', exact: true })
  ).toBeVisible();
}

export function clientCard(page: Page, name: string) {
  return page.getByRole('article').filter({
    has: page.getByRole('link', { name, exact: true }),
  });
}

export async function createClient(page: Page, name: string) {
  // Repeated create controls and their nested button roles perform the same action.
  await page
    .getByRole('button', { name: 'New Client', exact: true })
    .first()
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name', { exact: true }).fill(name);
  await dialog
    .getByRole('button', { name: 'Create Client', exact: true })
    .click();
  const card = clientCard(page, name);
  await expect(card).toBeVisible();
  return card;
}

export async function downloadConfiguration(page: Page, card: Locator) {
  const downloading = page.waitForEvent('download');
  await card.getByRole('link', { name: 'Download Configuration' }).click();
  const download = await downloading;
  expect(await download.failure()).toBeNull();
  return {
    filename: download.suggestedFilename(),
    contents: await text(await download.createReadStream()),
  };
}
