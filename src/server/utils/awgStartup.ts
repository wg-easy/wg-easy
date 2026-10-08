import type { DBServiceType } from '#db/sqlite';
import { detectAwgVersion } from '#server/utils/awgCapabilities';
import { generateAwgProfile } from '#server/utils/awgProfile';
import {
  assertAwgParameters,
  type AwgVersionRequest,
} from '#server/utils/awgProtocol';

type Settings = {
  WG_EXECUTABLE: string;
  AWG_PROTOCOL_VERSION?: AwgVersionRequest;
  AWG_PROTOCOL_VERSION_SET?: boolean;
  AWG_AUTO_GENERATE?: boolean;
};

export async function prepareAwgProfile(
  database: Pick<DBServiceType, 'interfaces' | 'clients' | 'userConfigs'>,
  settings: Settings,
  detect = detectAwgVersion
) {
  let current = await database.interfaces.get();
  const explicit = settings.AWG_PROTOCOL_VERSION_SET;
  const auto = settings.AWG_AUTO_GENERATE;
  const requested = settings.AWG_PROTOCOL_VERSION ?? 'latest';
  if (settings.WG_EXECUTABLE !== 'awg') {
    if (explicit || auto) {
      throw new Error(
        'AWG settings require EXPERIMENTAL_AWG=true and OVERRIDE_AUTO_AWG=awg'
      );
    }
    return current;
  }
  const freshKeys =
    current.privateKey === '---default---' &&
    current.publicKey === '---default---';
  // Existing installations stay unmanaged until the administrator opts in.
  if (!current.awgProtocolVersion && !freshKeys && !explicit && !auto)
    return current;
  if (
    current.awgProtocolVersion &&
    requested !== 'latest' &&
    requested !== current.awgProtocolVersion
  ) {
    throw new Error(
      'Changing the saved AWG protocol version requires migration of the server and client configurations'
    );
  }
  const clients = await database.clients.getAll();
  const fresh = freshKeys && clients.length === 0;
  const generate = auto && !current.awgProfileGenerated;
  if (generate && !fresh) {
    throw new Error(
      'AWG_AUTO_GENERATE requires a fresh configuration; existing server and client parameters must be migrated manually'
    );
  }
  const version = await detect(current.awgProtocolVersion ?? requested);
  if (!generate) {
    // Reject selecting a version that would silently discard saved parameters.
    assertAwgParameters(version, current);
    assertAwgParameters(version, await database.userConfigs.get());
    for (const client of clients) assertAwgParameters(version, client);
  }
  if (!current.awgProtocolVersion || generate) {
    await database.interfaces.initializeAwgProfile(
      version,
      generate ? generateAwgProfile(version) : undefined
    );
    current = await database.interfaces.get();
  }
  return current;
}
