// Generic macro to allow for save targeting effects
// Ensure macro is named "Save Effect"
// Run as "Everyone" using Advanced Macros

// Passed arguments:
// tokenId - Token Id
// targetIds - Array of token Ids 
// tracker - String that takes values "Token" or "Target"
// source - String denoting the name of effect causing a save
// passDamage - damageFlowParams
// passStatuses - Array statcond lids
// passApply - Boolean: set to false to remove passed statcond
// passDuration - Object containing paramters for LancerQOL Timed Effects
// failDamage - damageFlowParams
// failStatuses - Array statcond lids
// failApply - Boolean: set to false to remove passed statcond
// failDuration - Object containing paramters for LancerQOL Timed Effects

const applyStatus = game.macros.getName("Apply Statuses")
const editFlag = game.macros.getName("Edit Flag")
const token = canvas.tokens.get(scope.tokenId);
const tracker = scope.tracker ?? "Target";

// Create list of users with "OWNER" permissions to this token
permList = []
for (i in game.users.contents) {
	if (token.actor.testUserPermission(game.users.contents[i], "OWNER")) {
		permList.push(game.users.contents[i])
	}
};

// If a player other than the GM has "OWNER" perms, let this resolve on their end
if (permList.length > 1) {
	for (i in permList) {
		if (permList[i].isGM) {
			permList.splice(i, 1);
		};
	};
};

// Stop if player not permitted
if (!permList.includes(game.user)) {
	return;
};

if (typeof token.document.getFlag("world", "saveEffectCheck") !== "undefined") {
	return;
};
await token.document.setFlag("world", "saveEffectCheck", true) // Only allow the Dialog to be open once

// Define pass configs
var passDamage = scope.passDamage ?? false;
var passStatuses = scope.passStatuses ?? [];
var passApply = scope.passApply ?? true;
var passDuration = scope.passDuration ?? false

// Define fail configs
var failDamage = scope.failDamage ?? false;
var failStatuses = scope.failStatuses ?? [];
var failApply = scope.failApply ?? true;
var failDuration = scope.failDuration ?? false

const note = typeof(scope.source!=="undefined") ? "Source: "+scope.source : "";

// Wait for all saves to be complete
await Dialog.wait({
	title:"Confirm saves",
    content:`
        <form>
            <div class="form-group">
                Wait for all saves to be made before continuing.
            </div>
            <hr>
        </form>
    `,
    buttons:{
        ok:{
            label:"OK",
            callback:async()=>{
                let passIds = [];
                let failIds = [];
                for await(i of scope.targetIds) { // Populate Id Arrays and unset flags from appropriate tokens
                    let j = canvas.tokens.get(i)
                    if (typeof j.document.getFlag("world", "pass") !== "undefined" && j.document.getFlag("world", "pass") === true) {
                        passIds.push(i);
                        await editFlag.execute({targetId: j.document._id, flagName:"pass", set:false});
                    };
                    if (typeof j.document.getFlag("world", "fail") !== "undefined" && j.document.getFlag("world", "fail") === true) {
                        failIds.push(i);
                        await editFlag.execute({targetId: j.document._id, flagName:"fail", set:false});
                    };
                };
                await canvas.tokens.selectObjects(token) // Ensure original token is selected

                // TO DO - Figure how to combine these into a singular damage roll
                if (failIds.length > 0) {
                    await game.user.updateTokenTargets(failIds);
                    if (failDamage !== false) {
                        const failFlow = new(game.lancer.flows.get("DamageRollFlow"))(token.actor, failDamage);
                        await failFlow.begin();
                        if (passDamage !== false) {
                            let tempDamage = [];
                            for (i in game.messages?.contents.reverse()[0].rolls) {
                                let type = passDamage.damage[i].type;
                                let total = game.messages?.contents.reverse()[0].rolls[i]._total;
                                tempDamage.push({type:type, val:total.toString()})
                            };
                            console.log(tempDamage);
                            Object.assign(passDamage, {damage:tempDamage});
                        }
                    };
                    if (failStatuses.length > 0) {
                        for await(i of failIds) {
                            if (typeof game.modules.get("csm-lancer-qol").exposed.pushFlaggedEffect !== "undefined" && failDuration !== false) {
                                let tempDuration = structuredClone(failDuration);
                                if (tracker === "Token") {
                                    var originId = scope.tokenId
                                } else {
                                    var originId = i
                                };
                                if (game.combat.current.tokenId === originId) {
                                    tempDuration.turns++
                                }
                                for await (effect of failStatuses) {
                                    await game.modules.get("csm-lancer-qol").exposed.pushFlaggedEffect(i, game.items.find(i=>i.system.lid===effect).name, tempDuration, note, originId)
                                };
                            } else {
                                await applyStatus.execute({targetId:i, statuses:failStatuses, active:failApply})
                            }
                        };
                    };
                };

                if (passIds.length > 0) {
                    await game.user.updateTokenTargets(passIds);
                    if (passDamage !== false) {
                        const passFlow = new(game.lancer.flows.get("DamageRollFlow"))(token.actor, passDamage);
                        await passFlow.begin();
                    };
                    if (passStatuses.length > 0) {
                        for await(i of passIds) {
                            if (typeof game.modules.get("csm-lancer-qol").exposed.pushFlaggedEffect !== "undefined" && passDuration !== false) {
                                let tempDuration = structuredClone(passDuration);
                                if (tracker === "Token") {
                                    var originId = scope.tokenId
                                } else {
                                    var originId = i
                                };
                                if (game.combat.current.tokenId === originId) {
                                    tempDuration.turns++
                                }
                                for await (effect of passStatuses) {
                                    await game.modules.get("csm-lancer-qol").exposed.pushFlaggedEffect(i, game.items.find(i=>i.system.lid===effect).name, tempDuration, note, trackerId)
                                };
                            } else {
                                await applyStatus.execute({targetId:i, statuses:passStatuses, active:passApply})
                            };
                        };
                    };
                };
            }
        },
        cancel:{
            label:"Cancel",
            callback:async()=>{
                return ui.notifications.warn("Save Effect cancelled.", {})
            }
        }
    },
    close:async()=>{
        // Clear Dialog-stopping flag when Dialog is closed
        await token.document.unsetFlag("world", "saveEffectCheck");
    }
}, {top:100});
// Clear token targets after Dialog is finished
await game.user.updateTokenTargets();