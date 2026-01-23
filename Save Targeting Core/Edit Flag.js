// Used to allow inter-PC flag manipulation
// Ensure macro is named "Add Overshield"
// Run as "Game Master" using Advanced Macros

// Passed parameters:
// targetId - Token ID, 
// flagName - Name of Flag
// value - Value of Flag
// set - Boolean for setting or unsetting (default to set)

const target = canvas.tokens.get(scope.targetId);
const flagName = scope.flagName;
const value = scope.value;
const set = scope.set ?? true;

if (set === true) {
  await target.document.setFlag("world", flagName, value)
} else {
  await target.document.setFlag("world", flagName)
};