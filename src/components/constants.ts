// display constants
export const charactersBefore = 3;
export const maxChartersDisplayed = 2 * charactersBefore + 1;

// algorithmic constants

// delay (ms) above which press event is discarded
export const maxDelay = 10000;

// success rate expected before introducing a new letter
export const ratioThreshold = 0.98;

// number of success necessary to compensate an error, assuming there is
// no deprecation
export const errBias = 3;

export const unrepeatHalfLife = 2;
export const statsHalfLife = 10;
export const charSuccessHalfLife = 4;

// number of successful press of the lastly introduced letter expected before
// introducing a new letter
export const headGoodThreshold = 4;
