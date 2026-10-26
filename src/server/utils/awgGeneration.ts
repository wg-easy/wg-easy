import type { DBServiceType } from '#db/sqlite';
import { verifyAwgProfileSupport } from '#server/utils/awgCapabilities';
import { generateAwgProfile } from '#server/utils/awgProfile';

export function parseAwgAutoGenerate(value: string | undefined) {
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  throw new Error('AWG_AUTO_GENERATE must be true or false');
}

export async function prepareAwgProfile(
  database: Pick<DBServiceType, 'interfaces' | 'clients'>,
  settings: { WG_EXECUTABLE: string; AWG_AUTO_GENERATE?: boolean },
  verify = verifyAwgProfileSupport
) {
  let current = await database.interfaces.get();
  if (settings.WG_EXECUTABLE !== 'awg') {
    if (settings.AWG_AUTO_GENERATE)
      throw new Error(
        'AWG_AUTO_GENERATE requires AmneziaWG; enable EXPERIMENTAL_AWG and OVERRIDE_AUTO_AWG=awg'
      );
    return current;
  }
  if (!settings.AWG_AUTO_GENERATE || current.awgProfileGenerated)
    return current;
  if (
    current.privateKey !== '---default---' ||
    current.publicKey !== '---default---' ||
    (await database.clients.getAll()).length
  ) {
    throw new Error(
      'AWG_AUTO_GENERATE requires a fresh configuration; existing server and client settings are preserved'
    );
  }
  const profile = generateAwgProfile();
  await verify(profile);
  await database.interfaces.initializeAwgProfile(profile);
  current = await database.interfaces.get();
  return current;
}
