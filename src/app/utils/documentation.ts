import { version } from '@@/package.json';

const documentationVersion = version.split('.').slice(0, 2).join('.');

export const documentationUrl = `https://wg-easy.github.io/wg-easy/v${documentationVersion}/`;
