import { LANG } from '~/utils/config';

export default defineEventHandler((event) => {
  assertMethod(event, 'GET');
  setHeader(event, 'Content-Type', 'application/json');
  return `"${LANG}"`;
});
