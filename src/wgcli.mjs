'use strict';

// Import needed libraries
import bcrypt from 'bcryptjs';
import { Writable } from 'stream';
import readline from 'readline';
import WireGuardService from './services/WireGuard.js';

// Function to generate hash
const generateHash = async (password) => {
  try {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    // eslint-disable-next-line no-console
    console.log(`PASSWORD_HASH='${hash}'`);
  } catch (error) {
    throw new Error(`Failed to generate hash : ${error}`);
  }
};

// Function to compare password with hash
const comparePassword = async (password, hash) => {
  try {
    const match = await bcrypt.compare(password, hash);
    if (match) {
      // eslint-disable-next-line no-console
      console.log('Password matches the hash !');
    } else {
      // eslint-disable-next-line no-console
      console.log('Password does not match the hash.');
    }
  } catch (error) {
    throw new Error(`Failed to compare password and hash : ${error}`);
  }
};

const readStdinPassword = () => {
  return new Promise((resolve) => {
    process.stdout.write('Enter your password: ');

    const rl = readline.createInterface({
      input: process.stdin,
      output: new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
      terminal: true,
    });

    rl.question('', (answer) => {
      rl.close();
      // Print a new line after password prompt
      process.stdout.write('\n');
      resolve(answer);
    });
  });
};

const handleClientCommand = async (action, args) => {
  try {
    switch (action) {
      case 'create': {
        const name = args[0] || 'default_client';
        const expiredDate = args[1] || null;
        const client = await WireGuardService.createClient({ name, expiredDate });
        console.log(JSON.stringify(client));
        break;
      }
      case 'get': {
        const clientId = args[0];
        if (!clientId) {
          throw new Error('Usage: wgcli client get [CLIENT_ID]');
        }
        const client = await WireGuardService.getClient({ clientId });
        console.log(JSON.stringify(client));
        break;
      }
      case 'delete': {
        const clientId = args[0];
        if (!clientId) {
          throw new Error('Usage: wgcli client delete [CLIENT_ID]');
        }
        await WireGuardService.deleteClient({ clientId });
        console.log(`Client deleted: ${clientId}`);
        break;
      }
      case 'enable': {
        const clientId = args[0];
        if (!clientId) {
          throw new Error('Usage: wgcli client enable [CLIENT_ID]');
        }
        await WireGuardService.enableClient({ clientId });
        console.log(`Client enabled: ${clientId}`);
        break;
      }
      case 'disable': {
        const clientId = args[0];
        if (!clientId) {
          throw new Error('Usage: wgcli client disable [CLIENT_ID]');
        }
        await WireGuardService.disableClient({ clientId });
        console.log(`Client disabled: ${clientId}`);
        break;
      }
      default:
        throw new Error('Invalid client command. Usage: client [create|get|delete|enable|disable]');
    }
  } catch (error) {
    throw new Error(`Failed to execute client command: ${error.message}`);
  }
};

(async () => {
  try {
    // Retrieve command line arguments
    const args = process.argv.slice(2); // Ignore the first two arguments
    if (args.length < 1) {
      throw new Error('Usage: wgcli <command> [options]');
    }

    const [command, subCommand, ...restArgs] = args;

    switch (command) {
      case 'pw': {
        if (subCommand === 'hash') {
          if (restArgs.length > 0) {
            await generateHash(restArgs[0]);
          } else {
            const password = await readStdinPassword();
            await generateHash(password);
          }
        } else if (subCommand === 'compare') {
          if (restArgs.length !== 2) {
            throw new Error('Usage: wgcli pw compare [YOUR_PASSWORD] [HASH]');
          }
          await comparePassword(restArgs[0], restArgs[1]);
        } else {
          throw new Error('Invalid pw command. Usage: pw [hash|compare]');
        }
        break;
      }
      case 'client': {
        if (!subCommand) {
          throw new Error('Usage: wgcli client [create|delete|enable|disable]');
        }
        await handleClientCommand(subCommand, restArgs);
        break;
      }
      default:
        throw new Error('Invalid command. Usage: wgcli <pw|client> [options]');
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
})();
