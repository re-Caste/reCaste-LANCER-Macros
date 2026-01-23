// This is resilient against future invade options granted by:
// Mech Systems
// Core Passives
// Talents
// MAYBE Mech Traits (I don't have anything to test it on ;_;)

// Selection Check
if (canvas.tokens.controlled.length !== 1) {
	return ui.notifications.warn('Please select exactly 1 token.', {})
};

if (game.user.targets.size !== 1 && typeof scope.targetIds ==="undefined") {
	return ui.notifications.warn('Please target exactly 1 token.', {})
};

const token = canvas.tokens.controlled[0];
const target = game.user.targets.first();
const systems = token.actor.items.filter(i=>i.type==="mech_system")
const WACPTargetIds = scope.targetIds;

if (token.actor.items.find(i=>i.type==="frame").name.split(" ").pop()==="Chomolungma") {
	const scanIds = WACPTargetIds ?? [target.document._id];
	await game.macros.getName("Scan").execute({targets:scanIds});
};

if (!token.actor.system.class) {
	var invadeList = ["Fragment Signal"]
	var dscList = ["You feed false information, obscene messages, or phantom signals to your target’s computing core. They become IMPAIRED and SLOWED until the end of their next turn."]
} else {
	var invadeList = ["Fragment Signal - NPC"]
	var dscList = ["You feed false information, obscene messages, or phantom signals to your target’s computing core. They become IMPAIRED until the end of their next turn."]
};

try {
	let coreActions = token.actor.items.find(i=>i.type==="frame").system.core_system.passive_actions
	for await(i of coreActions) {
		if (i.activation === "Invade") {
			invadeList.push(i.name);
			dscList.push(i.detail);
		}
	}
} catch {
// pass - continue on with your day, no invades to be found in this core passive 
};

try {
	let traits = token.actor.items.find(i=>i.type==="frame").system.core_system.traits
	for await(i of traits) {
		for (j of traits.system.actions) {
			if (j.activation === "Invade") {
				invadeList.push(i.name);
				dscList.push(i.detail);
			}
		}
	}
} catch {
// pass - continue on with your day, no invades to be found in these traits
};

try {
	for await(i of systems) {
		if (i.system.destroyed===true) continue;
		const actions = i.system.actions;
		for await(j of actions) {
			if (j.activation === "Invade" || j.detail.startsWith("Make a tech attack")) {
				invadeList.push(j.name);
				dscList.push(j.detail);
			}
		}
	};
} catch {};

try {
	let talents = token.actor.system.pilot.value.items.filter(i=>i.type==="talent");
	for await(i of talents){
		for await(j of i.system.actions) {
			if (j.activation==="Invade") {
				invadeList.push(j.name);
				dscList.push(j.detail);
			}
		}
	};
} catch {}

if (typeof WACPTargetIds !== "undefined") {
	techAtk = new(game.lancer.flows.get("TechAttackFlow"))(token.actor, {title: "Wide Area Code Pulse", invade:true});
	await techAtk.begin();
	const attackTargets = game.messages.contents.reverse()[0].flags.lancer.attackData.targets
	const targetNames = WACPTargetIds.map(i=>canvas.tokens.get(i).document.name)
	const wait = async (ms) => new Promise((resolve)=> setTimeout(resolve, ms));
	await wait(2400);
	if (attackTargets.some(i=>i.hit===true)) {
		await Dialog.wait({
			title:"Invade // Targets: "+targetNames.join(" | "),
			buttons: invadeList.map((invade) => {
				if (typeof game.macros.getName(invade) !== "undefined") {
					var img = game.macros.getName(invade).img
				} else {
					var img = "systems/lancer/assets/icons/white/tech_full.svg"
				};
				return {
					label:`
						<div style="display: flex; align-items: center; margin-bottom: 1px; width: 300px;">
							<div style="width: 40px; height: 40px; overflow: hidden; margin-right: 10px;">
							<img src="${img}" style="width: 100%; height: auto;">
							</div>
							<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">// ${invade} //</span>
						</div>
					`,
					callback: async() => {
						let chat = {
							title:invade,
							description:dscList[invadeList.indexOf(invade)]
						};
						await new(game.lancer.flows.get("SimpleTextFlow"))(token.actor, chat).begin();
						if (typeof game.macros.getName(invade) !== "undefined") {
							for await(i of WACPTargetIds) {
								await game.user.updateTokenTargets([i])
								if (attackTargets.find(j=>j.id===i).hit===true) {
									await game.macros.getName(invade).execute()
								} else {
									await game.macros.getName("Apply Statuses").execute({targetId: i, statuses:["impaired"]})
								}
							};
							await game.user.updateTokenTargets([WACPTargetIds])
						}
					}
				}
			})
		})
	};
	return
}

if (token.document.disposition !== target.document.disposition) { 
	techAtk = new(game.lancer.flows.get("TechAttackFlow"))(token.actor, {invade:true});
	await techAtk.begin();
	var hit = game.messages.contents.reverse()[0].flags.lancer.attackData.targets[0].hit
	const wait = async (ms) => new Promise((resolve)=> setTimeout(resolve, ms));
	await wait(2400);
} else {
	var hit = true; //Guarantee the if statement passes if targeting ally with invade (see: willing invade)
	const pack = game.packs.get("lancer-weapon-fx.weaponfx");
	const techFXId = pack.index.find(i=>i.name==="DefaultTech")._id;
	const techFX = await pack.getDocument(techFXId);
	await techFX.execute();
};
if (hit === true) {
	await Dialog.wait({
		title:"Invade // Target: "+target.document.name,
		buttons: invadeList.map((invade) => {
			if (typeof game.macros.getName(invade) !== "undefined") {
				var img = game.macros.getName(invade).img
			} else {
				var img = "systems/lancer/assets/icons/white/tech_full.svg"
			};
			return {
				label:`
					<div style="display: flex; align-items: center; margin-bottom: 1px; width: 300px;">
						<div style="width: 40px; height: 40px; overflow: hidden; margin-right: 10px;">
						<img src="${img}" style="width: 100%; height: auto;">
						</div>
						<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">// ${invade} //</span>
					</div>
				`,
				callback: async() => {
					let chat = {
						title:invade,
						description:dscList[invadeList.indexOf(invade)]
					};
					await new(game.lancer.flows.get("SimpleTextFlow"))(token.actor, chat).begin();
					if (typeof game.macros.getName(invade) !== "undefined") {
						await game.macros.getName(invade).execute()
					}
					if (token.actor.items.find(i=>i.type==="frame").name.split(" ").pop()==="Minotaur") {
						await Dialog.wait({
							title:"Use Metafold Maze",
							buttons:{
								yes: {
									label:"OK",
									callback: async() => {
										await game.macros.getName("Metafold Maze").execute()
									}
								},
								no: {
									label:"Cancel",
									callback:()=>{}
								}
							}
						})
					}
				}
			}
		})
	})
};