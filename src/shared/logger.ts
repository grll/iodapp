/**
 * logger: A simple wrapper for logging errors.
 * You can plug in 'electron-log', 'winston', or any other logging lib.
 */
export const logger = {
  error: (message: string, error?: Error) => {
    // In production, write to logs on disk, or external logging service.
    // Here, we just show an example with console.error.
    console.error(`[ERROR]: ${message}`, error);
  },
  info: (message: string) => {
    console.info(`[INFO]: ${message}`);
  },
  // Add debug, warn, etc. as needed
};
