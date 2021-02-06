// display constants

export const charactersBefore = 3;
export const maxChartersDisplayed = 2 * charactersBefore + 1;

// algorithmic constants

// delai is understound as the time taken to strike a key, calculated since the last
// press event

// delai (ms) below which press event counts as a full success,
// regardless of average delay
export const quick = 500;

// ratio to mean delai below which press event counts as a full success
export const errRatio = 0.2;

// ratio to mean delai above which press event counts as a full error
export const succRatio = 4;

// delai (ms) above which press event is discarded
export const maxDelay = 10000;

// amount of event necessary to have passed for a given event's influence to half,
// when calculating global error rate and delay statistics
export const deprec = 10;

// number of successful press of the lastly introduced letter expected before
// introducing a new letter
export const countThreshold = 4;

// success rate expected before introducing a new letter
export const ratioThreshold = 0.95;

// total number of events expected before introducing a new letter
export const sinceNewHeadThreshold = 7;

// number of events (related to the same letter) to have passed for a given event's
// influence to half, as used in the baysian algorith
export const baysianDeprec = 5;

// number of success necessary to compensate an error, assuming there is
// no deprecation
export const errBias = 3;

// when the wrong type is in the leaning range,
// part of the error which is transferred to the accidental range
export const coResp = 0.3;
