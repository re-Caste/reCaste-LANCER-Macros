// Used for apply statuses to enemies as a player
// Ensure macro is named "Apply Statuses"
// Run as "Game Master" using Advanced Macros

// Passed parameters: 
// targetId - Token ID, 
// statuses - Array of status LIDs, 
// active - Boolean

const target = canvas.tokens.get(scope.targetId);
const statuses = scope.statuses;
const active = scope.active ?? true;

for await(i of statuses) {
	await target.actor.toggleStatusEffect(i, {active:active});
};