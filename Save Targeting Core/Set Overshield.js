// Used to allow inter-PC Overshield manipulation
// Ensure macro is named "Add Overshield"
// Run as "Game Master" using Advanced Macros

// Passed parameters:
// sourceId - Token ID
// targetId - Token ID, 
// value - Integer value to set target OS to

const target = canvas.tokens.get(scope.targetId);
const value = scope.value;
if (typeof(sourceId)!=="undefined") { // Emperor handling, skipped if not passed, but it probably should always be
  const token = canvas.tokens.get(scope.sourceId);
  if (token.actor.items.find(i=>i.type==="frame").name==="Emperor") {
    const gain = value - target.actor.system.overshield.value;
    if (gain > 0) {
      await token.actor.update({"system.overshield.value":Math.min(6+token.actor.system.grit, token.actor.system.overshield.value+gain)})

      const beams = ["jb2a.energy_strands.range.standard.purple.01", "jb2a.energy_strands.range.standard.purple.02", "jb2a.energy_strands.range.standard.purple.03", "jb2a.energy_strands.range.standard.purple.04"]
      const chosen = beams[Math.floor(Math.random()*beams.length)]
      await Sequencer.Preloader.preloadForClients(chosen)
      new Sequence()
        .effect()
          .file(chosen)
          .atLocation(target)
          .stretchTo(token)
          .waitUntilFinished()
          .filter("ColorMatrix", {hue:-100})
        .play()
    }
  }
};
await target.actor.update({"system.overshield.value":value});