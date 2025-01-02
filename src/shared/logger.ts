import log from 'electron-log';

/**
 * logger: A wrapper for electron-log.
 * Logs will appear in the following locations:
 * - on Linux: ~/.config/{app name}/logs/
 * - on macOS: ~/Library/Logs/{app name}/
 * - on Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs\
 */
export const logger = {
  error: (message: string, error?: Error) => {
    log.error(`${message}`, error);
  },
  info: (message: string) => {
    log.info(message);
  },
  // Add other log levels as needed
  debug: (message: string) => {
    log.debug(message);
  },
  warn: (message: string) => {
    log.warn(message);
  }
};
