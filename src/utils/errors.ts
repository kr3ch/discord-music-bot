export class BotError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string = message,
  ) {
    super(message);
    this.name = 'BotError';
  }
}

export class MusicError extends BotError {
  constructor(message: string, userMessage?: string) {
    super(message, userMessage);
    this.name = 'MusicError';
  }
}

export class SourceError extends BotError {
  constructor(message: string, userMessage?: string) {
    super(message, userMessage);
    this.name = 'SourceError';
  }
}
