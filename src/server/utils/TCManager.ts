import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { createDebug } from 'obug';

import Database from '#server/utils/Database';
import type { TcClass } from '#db/repositories/tcState/schema';

const TC_DEBUG = createDebug('TCManager');

const execAsync = promisify(exec);

/**
 * TCManager - Traffic Control Manager for WireGuard
 *
 * Applies HFSC bandwidth limits using Linux tc.
 *
 * Hierarchy:
 *   1: (root qdisc, default → defaultClassId)
 *     └─ 1:1 (root class, sc rate = totalUlRate, ul rate = totalUlRate)
 *         ├─ 1:{classId} (user classes, ls rate = ulRate/2, ul rate = ulRate)
 *         └─ …
 *
 * Command sequence:
 *   1. tc qdisc del dev {iface} root
 *   2. tc qdisc add dev {iface} parent root handle 1: hfsc default {defaultClassId}
 *   3. tc class add dev {iface} parent 1: classid 1:1 hfsc sc rate {totalUlRate}mbit ul rate {totalUlRate}mbit
 *   4. tc class add dev {iface} parent 1:1 classid 1:{classId} hfsc ls rate {lsRate}mbit ul rate {ulRate}mbit
 *   5. tc filter add dev {iface} parent 1: protocol ip prio 1 u32 match ip dst {ip} classid 1:{classId}
 *
 * Class ID convention: 100 + ulRate (e.g. ulRate=12 → classId=112)
 * No ip6, no src filters.
 */
class TCManager {
  private device: string = 'wg0';

  /**
   * Apply tc configuration from DB state
   */
  async applyConfig(): Promise<{ success: boolean; message: string }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get interface name
      try {
        const wgInterface = await Database.interfaces.get();
        this.device = wgInterface.name;
      } catch {
        TC_DEBUG('Using default device: wg0');
        this.device = 'wg0';
      }

      // Get TC state from DB
      const state = await Database.tcState.get();

      TC_DEBUG(`Starting tc configuration apply on ${this.device}...`);
      TC_DEBUG(`Default class: 1:${state.defaultClassId}, ${state.classes.length} user classes`);

      // Step 1: Full cleanup - remove existing rules
      TC_DEBUG('Removing existing tc rules...');
      try {
        await execAsync(`tc qdisc del dev ${this.device} root`, { timeout: 10000 });
      } catch (err: any) {
        const errMsg = (err?.stderr || err?.message || '').toLowerCase();
        if (
          !errMsg.includes('no such file or directory') &&
          !errMsg.includes('handle of zero') &&
          !errMsg.includes('cannot find')
        ) {
          errors.push(`Error removing existing rules: ${errMsg}`);
        } else {
          TC_DEBUG('No existing rules to remove (ignored)');
        }
      }

      // Step 2: Create root qdisc with default class
      TC_DEBUG(`Creating root qdisc (default ${state.defaultClassId})...`);
      try {
        await execAsync(
          `tc qdisc add dev ${this.device} parent root handle 1: hfsc default ${state.defaultClassId}`,
          { timeout: 10000 }
        );
      } catch (err: any) {
        errors.push(`Error creating root qdisc: ${err?.stderr || err?.message}`);
      }

      // Step 3: Create root class 1:1 at total channel bandwidth
      const totalUlRate = state.totalUlRate;
      TC_DEBUG(`Creating root class 1:1 at ${totalUlRate}mbit...`);
      try {
        await execAsync(
          `tc class add dev ${this.device} parent 1: classid 1:1 hfsc sc rate ${totalUlRate}mbit ul rate ${totalUlRate}mbit`,
          { timeout: 10000 }
        );
      } catch (err: any) {
        const errMsg = (err?.stderr || err?.message || '').toLowerCase();
        if (!errMsg.includes('exists')) {
          errors.push(`Error creating root class: ${errMsg}`);
        } else {
          warnings.push('Root class already exists');
        }
      }

      // Step 4: Create user-defined classes sorted by ulRate
      const sortedClasses = [...state.classes].sort((a, b) => a.ulRate - b.ulRate);
      TC_DEBUG(`Creating ${sortedClasses.length} user classes...`);

      for (const tcClass of sortedClasses) {
        const classId = tcClass.id;
        const ul = tcClass.ulRate;
        const ls = Math.floor(ul / 2) || 1;

        try {
          await execAsync(
            `tc class add dev ${this.device} parent 1:1 classid 1:${classId} hfsc ls rate ${ls}mbit ul rate ${ul}mbit`,
            { timeout: 10000 }
          );
          TC_DEBUG(`Class 1:${classId} created (ul=${ul}, ls=${ls})`);
        } catch (err: any) {
          const errMsg = (err?.stderr || err?.message || '').toLowerCase();
          if (!errMsg.includes('exists')) {
            errors.push(`Error creating class 1:${classId}: ${errMsg}`);
          } else {
            warnings.push(`Class 1:${classId} already exists`);
          }
        }
      }

      // Step 5: Create dst-only filters for each client IP
      for (const tcClass of sortedClasses) {
        for (const ip of tcClass.clientIps) {
          try {
            await execAsync(
              `tc filter add dev ${this.device} parent 1: protocol ip prio 1 u32 match ip dst ${ip} classid 1:${tcClass.id}`,
              { timeout: 10000 }
            );
            TC_DEBUG(`Filter added: dst ${ip} → class 1:${tcClass.id}`);
          } catch (err: any) {
            const errMsg = (err?.stderr || err?.message || '').toLowerCase();
            if (!errMsg.includes('exists')) {
              errors.push(`Error adding filter for ${ip}: ${errMsg}`);
            } else {
              warnings.push(`Filter for ${ip} already exists`);
            }
          }
        }
      }

      if (errors.length > 0) {
        TC_DEBUG(`Configuration applied with ${errors.length} errors`);
        return {
          success: false,
          message: `Configuration applied with errors:\n${errors.join('\n')}${
            warnings.length > 0 ? `\n\nWarnings:\n${warnings.join('\n')}` : ''
          }`,
        };
      }

      if (warnings.length > 0) {
        TC_DEBUG(`Configuration applied with ${warnings.length} warnings`);
        return {
          success: true,
          message: `Configuration applied with warnings:\n${warnings.join('\n')}`,
        };
      }

      TC_DEBUG('Configuration applied successfully');
      return { success: true, message: 'Traffic control configuration applied successfully' };
    } catch (err: any) {
      TC_DEBUG(`Critical error: ${err?.message}`);
      return {
        success: false,
        message: `Critical error applying configuration: ${err?.message}`,
      };
    }
  }

  /**
   * Remove all tc rules from the WireGuard interface
   */
  async cleanConfig(): Promise<void> {
    try {
      await execAsync(`tc qdisc del dev ${this.device} root`, { timeout: 10000 });
      TC_DEBUG('tc rules cleaned');
    } catch {
      TC_DEBUG('No tc rules to clean');
    }
  }
}

export default new TCManager();