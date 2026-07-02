import { readValidatedBody, createError } from 'h3';
import { containsCidr } from 'cidr-tools';

import Database from '#server/utils/Database';
import { definePermissionEventHandler } from '#server/utils/handler';
import { validateZod } from '#server/utils/types';
import { TcStateUpdateSchema } from '#db/repositories/tcState/types';
import TCManager from '#server/utils/TCManager';

export default definePermissionEventHandler(
  'admin',
  'any',
  async ({ event }) => {
    const body = await readValidatedBody(
      event,
      validateZod(TcStateUpdateSchema, event)
    );

    // Validate no IP is assigned to multiple classes
    const allIps = body.classes.flatMap((c) => c.clientIps);
    const uniqueIps = new Set(allIps);
    if (uniqueIps.size !== allIps.length) {
      throw createError({ statusCode: 400, statusMessage: 'An IP address cannot be assigned to multiple classes' });
    }

    // Validate class ID uniqueness
    const classIds = body.classes.map((c) => c.id);
    const uniqueIds = new Set(classIds);
    if (uniqueIds.size !== classIds.length) {
      throw createError({ statusCode: 400, statusMessage: 'Class IDs must be unique' });
    }

    // Validate IPs belong to WG subnet
    const wgInterface = await Database.interfaces.get();
    if (wgInterface.ipv4Cidr) {
      for (const cls of body.classes) {
        for (const ip of cls.clientIps) {
          if (!containsCidr(wgInterface.ipv4Cidr, ip)) {
            throw createError({
              statusCode: 400,
              statusMessage: `IP ${ip} is not within the WireGuard subnet ${wgInterface.ipv4Cidr}`,
            });
          }
        }
      }
    }

    // Validate class IDs are not root class (1:1)
    if (body.defaultClassId === 1) {
      throw createError({ statusCode: 400, statusMessage: 'Default class ID cannot be 1 (root class 1:1)' });
    }

    // Save state
    await Database.tcState.update(body);

    // Apply configuration
    const result = await TCManager.applyConfig();

    if (!result.success) {
      return { success: false, message: result.message };
    }

    return { success: true, message: result.message };
  }
);