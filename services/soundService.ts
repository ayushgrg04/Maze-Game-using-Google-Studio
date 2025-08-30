export enum Sound {
  StartGame = 'start-game',
  MovePawn = 'move-pawn',
  PlaceWall = 'place-wall',
  WinGame = 'win-game',
  LoseGame = 'lose-game',
  TimerTick = 'timer-tick',
  UIClick = 'ui-click',
  Error = 'error',
}

// Helper to construct absolute URLs for assets, resolving pathing issues in sandboxed environments.
const getAbsolutePath = (path: string): string => {
    if (typeof window === 'undefined') return path;
    // In some environments, root-relative paths might resolve against the wrong origin.
    // Prepending window.location.origin ensures we always fetch from our own domain.
    return `${window.location.origin}${path}`;
}

// Map sound enum to their corresponding file paths
const soundFiles: Record<Sound, string> = {
  [Sound.UIClick]: getAbsolutePath('/sounds/ui-click.mp3'),
  [Sound.StartGame]: getAbsolutePath('/sounds/start-game.mp3'),
  [Sound.MovePawn]: getAbsolutePath('/sounds/move-pawn.mp3'),
  [Sound.PlaceWall]: getAbsolutePath('/sounds/place-wall.mp3'),
  [Sound.WinGame]: getAbsolutePath('/sounds/win-game.mp3'),
  [Sound.LoseGame]: getAbsolutePath('/sounds/lose-game.mp3'),
  [Sound.TimerTick]: getAbsolutePath('/sounds/timer-tick.mp3'),
  [Sound.Error]: getAbsolutePath('/sounds/error.mp3'),
};


class SoundService {
  private _isMuted = false;

  constructor() {
    if (typeof window !== 'undefined') {
        const muted = localStorage.getItem('soundMuted') === 'true';
        this._isMuted = muted;
    }
  }

  public play(sound: Sound) {
    if (this._isMuted || typeof window === 'undefined') {
      return;
    }
    
    // Create a new Audio object for each playback. This is more robust for short,
    // fire-and-forget sound effects and avoids issues with browser autoplay policies.
    const audio = new Audio(soundFiles[sound]);
    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.catch(error => {
            // This warning is expected if the user hasn't interacted with the page yet.
            // Or if the play() call was not directly tied to a user event.
            console.warn(`Sound playback for "${sound}" was prevented:`, error);
        });
    }
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  public toggleMute() {
    this._isMuted = !this._isMuted;
    localStorage.setItem('soundMuted', this._isMuted.toString());
  }
}

export const soundService = new SoundService();