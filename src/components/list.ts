import { useReducer, useEffect } from 'react';

const deprec = 10;
const deprecFrecency = 2.5;
const countThreshold = 4;
const ratioThreshold = 0.95;
const charactersBefore = 3;
const maxChartersDisplayed = 7;
const errFact = 1.6;
const quick = 500;
const succFact = 0.8;

const factor = Math.LN2 / deprec;
const factorFrecency = Math.LN2 / deprecFrecency;

const interpol = (p1: number, v1: number, p2: number, v2: number, p: number) =>
  ((p - p1) / (p2 - p1)) * (v2 - v1) + v1;

const calcFact = (delay: number, mean: number) => {
  if (delay < quick) return succFact;
  if (delay < mean / 5) return succFact;
  if (delay < mean) return interpol(mean / 5, succFact, mean, 1, delay);
  if (delay < 4 * mean) return interpol(mean, 1, 2 * mean, errFact, delay);
  return errFact;
};

interface PreTarget {
  value: string;
  firstTime: boolean;
}

interface EaseMatrix {
  [character: string]: number;
}

interface FrecencyMatrix {
  [character: string]: number;
}

type Target = {
  index: number;
} & PreTarget;

interface State {
  count: number;
  targets: Target[];
  position: number;
  erroneous: boolean;
  cumulBad: number;
  cumulGood: number;
  countGood: number;
  backstoreCharacters: string;
  completed: boolean;
  lastPressTime?: number;
  delay0: number;
  delay1: number;
  delay2: number;
  lastChar: string;
  easeMatrix: EaseMatrix;
  frecencyMatrix: FrecencyMatrix;
}

export const press = (key: string, timeStamp: number) =>
  ({ type: 'PRESS', key, timeStamp } as const);
export const newChar = (key: string) => ({ type: 'NEW_CHAR', key } as const);

type Action = ReturnType<typeof press> | ReturnType<typeof newChar>;

function newTarget(state: State, target: PreTarget): State {
  let targets = state.targets.concat([{ ...target, index: state.count }]);
  let position = state.position;
  const increment = Math.exp(factorFrecency * state.count);
  const frecency = state.frecencyMatrix[target.value] + increment;
  const frecencyMatrix = { ...state.frecencyMatrix, [target.value]: frecency };
  if (targets.length === maxChartersDisplayed) {
    position -= 1;
    targets = targets.slice(1);
  }
  return {
    ...state,
    frecencyMatrix,
    position,
    targets,
    count: state.count + 1,
  };
}

function newCharacter(state: State): State {
  const total = Object.values(state.easeMatrix).reduce((a, b) => a + b, 0);
  const head = state.backstoreCharacters[0];
  if (!head) return { ...state, completed: true };
  return newTarget(
    {
      ...state,
      lastChar: head,
      easeMatrix: { ...state.easeMatrix, [head]: total / 2 },
      frecencyMatrix: { ...state.frecencyMatrix, [head]: 0 },
      backstoreCharacters: state.backstoreCharacters.slice(1),
      countGood: 0,
    },
    {
      value: head,
      firstTime: true,
    },
  );
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'PRESS': {
      const target = state.targets[state.position];
      if (!target) return state;
      const increment = Math.exp(factor * target.index);
      const stateOut = { ...state };
      stateOut.lastPressTime = action.timeStamp;
      stateOut.erroneous = state.targets[state.position].value !== action.key;
      if (!stateOut.erroneous) stateOut.position += 1;

      if (!state.erroneous && state.lastPressTime) {
        const delay = action.timeStamp - state.lastPressTime;
        stateOut.delay0 += increment;
        stateOut.delay1 += increment * delay;
        stateOut.delay2 += increment * delay * delay;
        let ease = state.easeMatrix[target.value];
        if (stateOut.erroneous) ease *= errFact;
        else {
          // ease *= succFact;
          ease *= calcFact(delay, stateOut.delay1 / stateOut.delay0);
        }
        const total = Object.values(state.easeMatrix).reduce(
          (a, b) => a + b,
          0,
        );
        const len = Object.values(state.easeMatrix).length;
        Math.min(ease, 0.8 * total);
        Math.max(ease, (0.1 / len) * total);
        // ease = Math.max(ease, total * 0.01);
        // entry cannot exceed 50% frequency
        // ease = Math.min(ease, total - state.easeMatrix[action.key]);
        stateOut.easeMatrix = { ...state.easeMatrix, [target.value]: ease };
        // for (const k of Object.keys(stateOut.easeMatrix)) {
        //   stateOut.easeMatrix[k] /= total;
        // }

        if (stateOut.erroneous) {
          stateOut.cumulBad = state.cumulBad + increment;
          return stateOut;
        }
        stateOut.erroneous = false;
        stateOut.cumulGood = state.cumulGood + increment;
        if (target.value === state.lastChar)
          stateOut.countGood = state.countGood + 1;
        if (
          stateOut.countGood > countThreshold &&
          stateOut.cumulGood / (stateOut.cumulGood + stateOut.cumulBad) >
            ratioThreshold
        ) {
          return newCharacter(stateOut);
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

function newTargetValue(state: State) {
  const weight = (key: string) =>
    state.easeMatrix[key] / state.frecencyMatrix[key];
  const total = Object.keys(state.easeMatrix)
    .map(key => weight(key))
    .reduce((a, b) => a + b, 0);
  const pick = Math.random() * total;
  let character: string;
  let cumul = 0;
  for (const key of Object.keys(state.easeMatrix)) {
    character = key;
    cumul += weight(key);
    if (cumul >= pick) break;
  }
  return character!;
}

export default function useList(characters: string) {
  const backstoreCharacters = characters.slice(2);
  const state0: State = {
    count: 0,
    targets: [],
    position: 0,
    erroneous: false,
    cumulBad: 0,
    cumulGood: 0,
    countGood: 0,
    backstoreCharacters,
    completed: false,
    delay0: 0,
    delay1: 0,
    delay2: 0,
    lastChar: characters[1],
    easeMatrix: {
      [characters[0]]: 0.5,
      [characters[1]]: 0.5,
    },
    frecencyMatrix: {
      [characters[0]]: 1,
      [characters[1]]: 1,
    },
  };

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
      dispatch(newChar(newTargetValue(state)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, state.targets.length, state.position]);

  return [state, dispatch] as [State, typeof dispatch];
}
