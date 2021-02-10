import { useReducer, useEffect } from 'react';
import {
  ratioThreshold,
  maxDelay,
  errBias,
  charactersBefore,
  maxChartersDisplayed,
  unrepeatHalfLife,
  statsHalfLife,
  charSuccessHalfLife,
  headGoodThreshold,
} from './constants';

import rfdc from 'rfdc';

const clone = rfdc();

export type Immutable<T> = {
  readonly [K in keyof T]: Immutable<T[K]>;
};

interface CharStats {
  errorRatio: number;
  lastCalledIndex: number | undefined;
}

interface PreTarget {
  value: string;
  firstTime: boolean;
}
type Target = {
  index: number;
} & PreTarget;

export interface State {
  completed: boolean; // standards have been met with last character
  targets: Target[]; // character instances to be typed
  position: number; // index within targets of character expected to be pressed
  correct: boolean; // true if last press event was successful
  succRatio: number; // weighted number of success, any character
  headGoodCount: number; // number of success with lastly added character
  sinceNewHeadCount: number; // number of success since lastly added character
  backstoreCharacters: string[]; // characters that are not active yet, in order
  lastPressTime?: number; // time of the last press event
  delayMean?: number; // weighted number of registered events, will equal goodCumul + badCumul
  head: string; // lastly added character
  charStatsMatrix: { [character: string]: CharStats };
  count: number;
  wantsNewTarget: boolean;
}

// draw a character with a flat distribution
function drawFlatTarget(state: Immutable<State>, seed: number): string {
  let pick = seed * (Object.keys(state.charStatsMatrix).length - 1);
  let key;
  for (const key0 of Object.keys(state.charStatsMatrix)) {
    key = key0;
    if (key === state.targets[state.targets.length - 1]?.value) continue;
    pick -= 1;
    if (pick <= 0) return key;
  }
  if (!key) throw new Error('Expected non void selection.');
  return key;
}

function drawWeightedTarget(state: Immutable<State>, seed: number): string {
  const p = Math.pow(2, -1 / unrepeatHalfLife);
  const index = state.targets[state.targets.length - 1]?.index + 1 || 0;
  const weight = ({ errorRatio, lastCalledIndex }: CharStats) => {
    if (lastCalledIndex === undefined) return errorRatio;
    return errorRatio * (1 - Math.pow(p, index - lastCalledIndex - 1));
  };
  let total = Object.values(state.charStatsMatrix).reduce(
    (total, charStats) => total + weight(charStats),
    0,
  );
  let pick = seed * total;
  let key;
  for (const [key0, charStats] of Object.entries(state.charStatsMatrix)) {
    key = key0;
    pick -= weight(charStats);
    if (pick <= 0) return key;
  }
  if (!key) throw new Error('charStatsMatrix should not be empty.');
  return key;
}

function drawTarget(state: Immutable<State>, seed: number): string {
  if (
    state.headGoodCount < headGoodThreshold &&
    state.targets[state.targets.length - 1]?.value !== state.head &&
    seed > 0.8
  )
    return state.head;
  seed /= 0.8;
  if (Math.random() > 0.95) return drawFlatTarget(state, seed / 0.95);
  return drawWeightedTarget(state, seed / 0.95);
}

const updateMean = (
  newVal: number,
  mean: number | undefined,
  halfLife: number,
) =>
  mean === undefined
    ? newVal
    : Math.pow(2, -1 / halfLife) * (mean - newVal) + newVal;

const press = (key: string, timeStamp: number) =>
  ({ type: 'PRESS', key, timeStamp } as const);

const newRandomTarget = (seed: number) =>
  ({ type: 'NEW_RANDOM_TARGET', seed } as const);
// export const newChar = (key: string) => ({ type: 'NEW_CHAR', key } as const);

type Action = ReturnType<typeof press> | ReturnType<typeof newRandomTarget>;

// adds a character instance to the typing flow
function newTarget(
  state: Immutable<State>,
  target: PreTarget,
  init = false,
): State {
  const stateOut = clone(state) as State;
  // const index = stateOut.targets[stateOut.targets.length - 1]?.index + 1 || 0;
  ++stateOut.count;
  stateOut.targets.push({ ...target, index: stateOut.count });
  stateOut.charStatsMatrix[target.value].lastCalledIndex = stateOut.count;
  if (stateOut.targets.length > maxChartersDisplayed) {
    stateOut.targets = stateOut.targets.slice(1);
  } else {
    if (!init) ++stateOut.position;
  }
  stateOut.wantsNewTarget = false;
  return stateOut;
}

// adds a character type to active set
function newCharacter(state: Immutable<State>, init = false): State {
  const stateOut = clone(state) as State;
  stateOut.head = state.backstoreCharacters[0];
  if (!stateOut.head) {
    stateOut.completed = true;
    return stateOut;
  }
  stateOut.wantsNewTarget = false;
  stateOut.backstoreCharacters.shift();
  stateOut.sinceNewHeadCount = 0;
  stateOut.headGoodCount = 0;
  stateOut.charStatsMatrix[stateOut.head] = {
    errorRatio: 1,
    lastCalledIndex: undefined,
  };
  return newTarget(
    stateOut,
    {
      value: stateOut.head,
      firstTime: true,
    },
    init,
  );
}

function registerCharacterPress(
  state: State,
  { key, timeStamp }: ReturnType<typeof press>,
): State {
  const target = state.targets[state.position];
  if (!target) throw new Error('target must not be empty when key pressed');
  const lastCorrect = state.correct;
  state.correct = target.value === key;
  if (lastCorrect) {
    if (state.correct) {
      state.succRatio = updateMean(1, state.succRatio, statsHalfLife);
      state.charStatsMatrix[target.value].errorRatio = updateMean(
        0,
        state.charStatsMatrix[target.value].errorRatio,
        charSuccessHalfLife,
      );
      if (state.lastPressTime) {
        const delay = timeStamp - state.lastPressTime;
        if (delay < maxDelay) {
          state.delayMean = updateMean(delay, state.delayMean, statsHalfLife);
        }
      }
      if (target.value === state.head) ++state.headGoodCount;
    } else {
      state.succRatio = updateMean(0, state.succRatio, statsHalfLife);
      state.charStatsMatrix[target.value].errorRatio = updateMean(
        1,
        state.charStatsMatrix[target.value].errorRatio,
        charSuccessHalfLife * errBias,
      );
    }
  }

  state.lastPressTime = timeStamp;
  return state;
}

function reducer(state: Immutable<State>, action: Action): State {
  switch (action.type) {
    case 'PRESS': {
      const stateOut = clone(state) as State;
      registerCharacterPress(stateOut, action);
      if (state.correct) {
        if (
          stateOut.correct &&
          state.succRatio > ratioThreshold &&
          stateOut.headGoodCount >= headGoodThreshold
        ) {
          return newCharacter(stateOut);
        }
      }
      if (stateOut.correct) stateOut.wantsNewTarget = true;
      return stateOut;
    }
    case 'NEW_RANDOM_TARGET': {
      return newTarget(state, {
        value: drawTarget(state, action.seed),
        firstTime: false,
      });
    }
  }
}

export default function useList(characters: string) {
  let state0: State = {
    targets: [],
    succRatio: 1,
    delayMean: undefined,
    position: 0,
    correct: true,
    sinceNewHeadCount: 0,
    headGoodCount: 0,
    backstoreCharacters: characters.split(''),
    completed: false,
    head: '',
    charStatsMatrix: {},
    count: 0,
    wantsNewTarget: false,
  };
  state0 = newCharacter(state0, true);
  while (state0.targets.length < charactersBefore + 1) {
    state0 = newTarget(
      state0,
      {
        value: drawTarget(state0, Math.random()),
        firstTime: false,
      },
      true,
    );
  }

  const [state, dispatch] = useReducer(reducer, state0);

  // out of reducer because impure (randomness)
  useEffect(() => {
    if (state.wantsNewTarget) {
      dispatch(newRandomTarget(Math.random()));
    }
  }, [dispatch, state.wantsNewTarget]);

  const sendKey = (key: string, timeStamp: number) => {
    if (key.length === 1) {
      dispatch(press(key, timeStamp));
    }
  };

  // return [state];

  // const keyDownHandler: React.KeyboardEventHandler = event => {
  //   const { key, timeStamp } = event;
  //   event.preventDefault();
  //   keyDown(key, timeStamp);
  // };

  return [state, sendKey] as [State, typeof sendKey];
}
