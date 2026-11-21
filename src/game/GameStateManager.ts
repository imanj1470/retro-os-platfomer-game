type GameState = 'playing' | 'paused' | 'gameover' | 'levelcomplete';
type GameEvent = 'score' | 'death' | 'complete' | 'pause';

interface EventListener {
  event: GameEvent;
  callback: () => void;
}

export class GameStateManager {
  private scoreValue: number = 0;
  private livesValue: number = 3;
  private stateValue: GameState = 'playing';
  private listeners: EventListener[] = [];

  public get score(): number {
    return this.scoreValue;
  }

  public get lives(): number {
    return this.livesValue;
  }

  public get state(): GameState {
    return this.stateValue;
  }

  public addScore(amount: number): void {
    this.scoreValue += amount;
    this.emit('score');
  }

  public loseLife(): void {
    this.livesValue = Math.max(0, this.livesValue - 1);
    this.emit('death');

    if (this.livesValue <= 0) {
      this.stateValue = 'gameover';
    }
  }

  public completeLevel(): void {
    this.stateValue = 'levelcomplete';
    this.emit('complete');
  }

  public setPause(paused: boolean): void {
    if (paused && this.stateValue === 'playing') {
      this.stateValue = 'paused';
    } else if (!paused && this.stateValue === 'paused') {
      this.stateValue = 'playing';
    }
    this.emit('pause');
  }

  public reset(): void {
    this.scoreValue = 0;
    this.livesValue = 3;
    this.stateValue = 'playing';
  }

  public on(event: GameEvent, callback: () => void): void {
    this.listeners.push({ event, callback });
  }

  private emit(event: GameEvent): void {
    for (const listener of this.listeners) {
      if (listener.event === event) {
        listener.callback();
      }
    }
  }
}
