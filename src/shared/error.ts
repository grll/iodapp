/**
 * AppError: An error class that separates user-friendly messages
 * from a detailed stack trace and any additional debug info.
 */
export class AppError extends Error {
  /**
   * The user-friendly message to display to the user.
   */
  public userMessage: string;
  /**
   * The original error, if any.
   */
  public originalError?: Error;

  constructor({
    developerMessage,
    userMessage,
    originalError,
  }: {
    developerMessage: string;
    userMessage: string;
    originalError?: Error;
  }) {
    // The base class 'message' mostly for internal logging/debugging
    super(developerMessage);
    this.userMessage = userMessage;
    this.originalError = originalError;
    // Ensure the prototype chain is correct
    Object.setPrototypeOf(this, AppError.prototype);
  }
}