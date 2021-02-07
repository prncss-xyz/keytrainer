import { useReducer, useEffect } from 'react';
import {
  deprec,
  countThreshold,
  ratioThreshold,
  quick,
  maxDelay,
  baysianDeprec,
  sinceNewHeadThreshold,
  errBias,
  // coResp,
  errRatio,
  succRatio,
  charactersBefore,
  maxChartersDisplayed,
  errSkew,
  // confusionDeprec,
  baysianExponent,
} from './constants';

type Immutable<T> = {
  readonly [K in keyof T]: Immutable<T[K]>;
};

const interpol = (p1: number, v1: number, p2: number, v2: number, p: number) =>
  ((p - p1) / (p2 - p1)) * (v2 - v1) + v1;

const calcErrorFact = (mean: number, eqt: number, delay: number) => {
  return 0;
  if (delay < quick) return 0;
  if (delay < mean * succRatio) return 0;
  if (delay < mean) return interpol(mean * succRatio, 0, mean, errSkew, delay);
  if (delay < mean * errRatio)
    return interpol(mean, errSkew, mean * errRatio, 1, delay);
  return 1;
};

interface CharStats {
  errorCumul: number;
  succCumul: number;
  confusionMatrix: { [character: string]: number };
}

interface PreTarget {
  value: string;
  firstTime: boolean;
}
type Target = {
  index: number;
} & PreTarget;

interface State {
  completed: boolean; // standards have been met with last character
  targets: Target[]; // character instances to be typed
  position: number; // index within targets of character expected to be pressed
  erroneous: boolean; // true if last press event was erroneous
  goodCumul: number; // weighted number of success, any character
  badCumul: number; // weighted number of errors, any character
  headGoodCount: number; // number of success with lastly added character
  sinceNewHeadCount: number; // number of success since lastly added character
  backstoreCharacters: string[]; // characters that are not active yet, in order
  lastPressTime?: number; // time of the last press event
  delay0: number; // weighted number of registered events, will equal goodCumul + badCumul
  delay1: number; // weighted sum of events' delay
  delay2: number; // weighted sum of square of events' delay
  head: string; // lastly added character
  charStatsMatrix: { [character: string]: CharStats };
}

const cloneState = (state: Immutable<State>): State => ({
  ...state,
  targets: [...state.targets],
  charStatsMatrix: { ...state.charStatsMatrix },
  backstoreCharacters: [...state.backstoreCharacters],
});

// draw a character with a flat distribution
function drawFlatChar(state: Immutable<State>): string {
  let pick = Math.random() * (Object.keys(state.charStatsMatrix).length - 1);
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

function drawBaysianChar(state: Immutable<State>): string {
  const weight = (charStats: CharStats) =>
    Math.pow(
      charStats.errorCumul / (charStats.errorCumul + charStats.succCumul),
      baysianExponent,
    );
  let total = 0;
  for (const [key, charStats] of Object.entries(state.charStatsMatrix)) {
    if (key === state.targets[state.targets.length - 1]?.value) continue;
    total += weight(charStats);
  }
  let pick = Math.random() * total;
  let key;
  for (const [key0, charStats] of Object.entries(state.charStatsMatrix)) {
    key = key0;
    if (key === state.targets[state.targets.length - 1]?.value) continue;
    pick -= weight(charStats);
    if (pick <= 0) return key;
  }
  return key || drawFlatChar(state);
}

// draw a character from active characters, THE algorith
function drawChar(state: Immutable<State>): string {
  if (
    state.headGoodCount < countThreshold &&
    state.targets[state.targets.length - 1]?.value !== state.head &&
    Math.random() < 0.2
  )
    return state.head;
  if (Math.random() < 0.05) return drawFlatChar(state);
  return drawBaysianChar(state);
}

export const press = (key: string, timeStamp: number) =>
  ({ type: 'PRESS', key, timeStamp } as const);
export const newChar = (key: string) => ({ type: 'NEW_CHAR', key } as const);

type Action = ReturnType<typeof press> | ReturnType<typeof newChar>;

// adds a character instance to the typing flow
function newTarget(state: Immutable<State>, target: PreTarget): State {
  const stateOut = cloneState(state);
  const index = state.targets[state.targets.length - 1]?.index + 1 || 0;
  stateOut.targets.push({ ...target, index });
  if (stateOut.targets.length > maxChartersDisplayed) {
    stateOut.position -= 1;
    stateOut.targets = stateOut.targets.slice(1);
  }
  return stateOut;
}

// adds a character type to active set
function newCharacter(state: Immutable<State>): State {
  const stateOut = cloneState(state);
  stateOut.head = state.backstoreCharacters[0];
  if (!stateOut.head) {
    stateOut.completed = true;
    return stateOut;
  }
  stateOut.backstoreCharacters.shift();
  stateOut.sinceNewHeadCount = 0;
  stateOut.headGoodCount = 0;
  stateOut.charStatsMatrix[stateOut.head] = {
    errorCumul: 1,
    succCumul: 0,
    confusionMatrix: {},
  };
  return newTarget(stateOut, {
    value: stateOut.head,
    firstTime: true,
  });
}

function registerCharacterPress(
  state: State,
  target: Target,
  pressed: string,
  delay: number,
): State {
  const increment = Math.exp((Math.LN2 / deprec) * target.index);
  state.delay0 += increment;
  state.delay1 += increment * delay;
  state.delay2 += increment * delay * delay;
  const fact = Math.pow(2, -1 / baysianDeprec);

  const char = target.value;

  if (state.erroneous) {
    state.badCumul += increment;
    // if (pressed in stateOut.charStatsMatrix) {
    //   stateOut.charStatsMatrix[char].errorCumul =
    //     stateOut.charStatsMatrix[char].errorCumul * fact +
    //     (1 - fact) * (1 - coResp);
    //   stateOut.charStatsMatrix[pressed] = {
    //     ...stateOut.charStatsMatrix[pressed],
    //   };
    //   stateOut.charStatsMatrix[pressed].errorCumul =
    //     stateOut.charStatsMatrix[pressed].errorCumul * fact +
    //     (1 - fact) * coResp;

    //   stateOut.charStatsMatrix[char].confusionMatrix = {
    //     ...stateOut.charStatsMatrix[char].confusionMatrix,
    //   };
    //   stateOut.charStatsMatrix[char].confusionMatrix[pressed] =
    //     stateOut.charStatsMatrix[char].confusionMatrix[pressed] || 0;
    //   stateOut.charStatsMatrix[char].confusionMatrix[pressed] += Math.exp(
    //     (Math.LN2 / confusionDeprec) * target.index,
    //   );
    //   return stateOut;
    // }
    state.charStatsMatrix[char].errorCumul =
      state.charStatsMatrix[char].errorCumul * fact + (1 - fact);
    return state;
  }

  const eqt = Math.sqrt(
    (state.delay2 - (state.delay1 * state.delay1) / state.delay0) /
      state.delay0,
  );
  const mean = state.delay1 / state.delay0;
  const errorFact = calcErrorFact(mean, eqt, delay);

  state.goodCumul = state.goodCumul + increment;
  state.charStatsMatrix[char].errorCumul =
    state.charStatsMatrix[char].errorCumul * fact + (1 - fact) * errorFact;
  state.charStatsMatrix[char].succCumul =
    state.charStatsMatrix[char].succCumul * fact +
    ((1 - fact) * (1 - errorFact)) / errBias;
  return state;
}

function reducer(state: Immutable<State>, action: Action): State {
  switch (action.type) {
    case 'PRESS': {
      const stateOut = cloneState(state);
      stateOut.lastPressTime = action.timeStamp;
      const target = state.targets[state.position];
      if (!target) throw new Error('target must not be empty when key pressed');
      stateOut.erroneous = target.value !== action.key;
      if (!stateOut.erroneous) ++stateOut.position;
      if (!state.erroneous && state.lastPressTime) {
        const delay = action.timeStamp - state.lastPressTime;
        if (delay > maxDelay) return stateOut;
        registerCharacterPress(stateOut, target, action.key, delay);
        if (!state.erroneous) {
          ++stateOut.sinceNewHeadCount;
          if (target.value === state.head) {
            ++stateOut.headGoodCount;
            const succRatio =
              stateOut.goodCumul / (stateOut.goodCumul + stateOut.badCumul);
            if (
              Object.keys(stateOut.charStatsMatrix).length === 1 ||
              (succRatio > ratioThreshold &&
                stateOut.sinceNewHeadCount > sinceNewHeadThreshold)
            ) {
              const goodThreshold = interpol(
                ratioThreshold,
                countThreshold,
                0.995,
                1,
                succRatio,
              );
              if (stateOut.headGoodCount >= goodThreshold) {
                return newCharacter(stateOut);
              }
            }
          }
        }
      }
      return stateOut;
    }
    case 'NEW_CHAR': {
      return newTarget(state, {
        value: action.key,
        firstTime: false,
      });
    }
  }
}

export default function useList(characters: string) {
  let state0: State = {
    targets: [],
    position: 0,
    erroneous: false,
    badCumul: 0,
    goodCumul: 0,
    sinceNewHeadCount: 0,
    headGoodCount: 0,
    backstoreCharacters: characters.split(''),
    completed: false,
    delay0: 0,
    delay1: 0,
    delay2: 0,
    head: '',
    charStatsMatrix: {},
  };
  state0 = newCharacter(state0);
  while (state0.targets.length < charactersBefore + 1) {
    state0 = newTarget(state0, {
      value: drawChar(state0),
      firstTime: false,
    });
  }

  const [state, dispatch] = useReducer(reducer, state0);

  useEffect(() => {
    const handler = ({ key, timeStamp }: KeyboardEvent) => {
      if (key.length === 1) dispatch(press(key, timeStamp));
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [dispatch]);

  useEffect(() => {
    if (state.targets.length - state.position - 1 < charactersBefore) {
      dispatch(newChar(drawChar(state)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, state.targets.length, state.position]);

  return [state, dispatch] as [State, typeof dispatch];
}
