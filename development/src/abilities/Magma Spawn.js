/*
*
*	Magma Spawn abilities
*
*/
G.abilities[4] =[

// 	First Ability: Boiling Point
{
	//	Type : Can be "onQuery", "onStartPhase", "onDamage"
	trigger : "onStartPhase",

	// 	require() :
	require : function() { return this.testRequirements(); },

	//	activate() :
	activate : function() {
		// Leave two traps behind
		this._addTrap(this.creature.hexagons[1]);
		this._addTrap(this.creature.hexagons[this.creature.player.flipped ? 0 : 2]);
	},

	_addTrap: function(hex) {
		var ability = this;

		// Traps last forever if upgraded, otherwise 1 turn
		var lifetime = this.isUpgraded() ? 0 : 1;

		hex.createTrap(
			"scorched-ground",
			[
				new Effect(
					this.title, this.creature, hex, "onStepIn",
					{
						requireFn: function() {
							if (!this.trap.hex.creature) return false;
							// Magma Spawn immune to Scorched Ground
							return this.trap.hex.creature.id !== ability.creature.id;
						},
						effectFn: function(effect, crea) {
							crea.takeDamage(
								new Damage(effect.attacker, ability.damages, 1, []));
							this.trap.destroy();
						},
						attacker: this.creature
					}
				)
			],
			this.creature.player,
			{
				turnLifetime: lifetime,
				ownerCreature: this.creature,
				fullTurnLifetime: true
			}
		);
	}
},

// 	Second Ability: Pulverizing Hit
{
	trigger: "onQuery",

	// Track the last target
	_lastTargetId: -1,

	// 	require() :
	require : function() {
		if( !this.testRequirements() ) return false;

		if( !this.atLeastOneTarget( this.creature.getHexMap(frontnback3hex), "enemy" ) ) {
			this.message = G.msg.abilities.notarget;
			return false;
		}
		return true;
	},

	// 	query() :
	query : function() {
		var ability = this;
		var magmaSpawn = this.creature;

		G.grid.queryCreature( {
			fnOnConfirm : function() { ability.animation.apply(ability, arguments); },
			team : 0, // Team, 0 = enemies
			id : magmaSpawn.id,
			flipped : magmaSpawn.flipped,
			hexs : this.creature.getHexMap(frontnback3hex),
		});
	},


	//	activate() :
	activate : function(target, args) {
		var ability = this;
		ability.end();

		// Deal burn damage based on number of times used
		var d = {
			burn: this.damages.burn * (this.timesUsed + 1), crush: this.damages.crush
		};
		// If upgraded, extra damage if hitting the same target
		if (this.isUpgraded() && target.id === this._lastTargetId) {
			d.burn *= 2;
		}
		this._lastTargetId = target.id;

		var damage = new Damage(
			ability.creature, // Attacker
			d, // Damage Type
			1, // Area
			[]	// Effects
		);

		target.takeDamage(damage);
	},
},



// 	Thirt Ability: Cracked Earth
{
	//	Type : Can be "onQuery", "onStartPhase", "onDamage"
	trigger : "onQuery",

	map : [  [0,0,1,0],
			[0,0,1,1],
			 [0,1,1,0],//origin line
			[0,0,1,1],
			 [0,0,1,0]],

	require: function() {
		return this.testRequirements();
	},

	// 	query() :
	query : function() {
		var ability = this;
		var magmaSpawn = this.creature;

		this.map.origin = [0,2];

		G.grid.queryChoice( {
			fnOnConfirm : function() { ability.animation.apply(ability, arguments); },
			team : "both",
			requireCreature : 0,
			id : magmaSpawn.id,
			flipped : magmaSpawn.flipped,
			choices : [
				magmaSpawn.getHexMap(this.map),
				magmaSpawn.getHexMap(this.map, true)
			],
		});

	},


	//	activate() :
	activate : function(hexs, args) {
		var ability = this;
		ability.end();

		// Basic Attack all nearby creatures
		ability.areaDamage(
			ability.creature, // Attacker
			ability.damages1, // Damage Type
			[],	// Effects
			ability.getTargets(hexs) // Targets
		);

		// If upgraded, leave Boiling Point traps on all hexes that don't contain a
		// creature
		if (this.isUpgraded()) {
			hexs.each(function() {
				if (!this.creature) {
					ability.creature.abilities[0]._addTrap(this);
				}
			});
		}
	}
},



// 	Fourth Ability: Molten Hurl
{
	//	Type : Can be "onQuery","onStartPhase","onDamage"
	trigger : "onQuery",

	directions : [0,1,0,0,1,0],

	require : function() {
		if( !this.testRequirements() ) return false;

		// Creature must be moveable
		if (!this.creature.stats.moveable) {
			this.message = G.msg.abilities.notmoveable;
			return false;
		}

		var magmaSpawn = this.creature;
		var x = (magmaSpawn.player.flipped) ? magmaSpawn.x-magmaSpawn.size+1 : magmaSpawn.x ;

		if (!this.testDirection({
				team: "enemy", x: x, directions: this.directions
			})) {
			return false;
		}
		return true;
	},

	// 	query() :
	query : function() {
		var ability = this;
		var magmaSpawn = this.creature;

		var x = (magmaSpawn.player.flipped) ? magmaSpawn.x-magmaSpawn.size+1 : magmaSpawn.x ;

		G.grid.queryDirection( {
			fnOnConfirm : function() { ability.animation.apply(ability, arguments); },
			team : "enemy",
			id : magmaSpawn.id,
			requireCreature : true,
			x : x,
			y : magmaSpawn.y,
			directions : this.directions,
		});
	},


	//	activate() :
	activate : function(path,args) {
		var ability = this;
		var magmaSpawn = this.creature;

		ability.end(false,true);

		// Damage
		var damage = new Damage(
			ability.creature, // Attacker
			ability.damages, // Damage Type
			1, // Area
			[]	// Effects
		);

		// Movement
		var hurl = function(_path) {
			var target = _path.last().creature;

			var magmaHex = magmaSpawn.hexagons[
				args.direction === 4 ? magmaSpawn.size - 1 : 0];
			_path.filterCreature(false, false);
			_path.unshift(magmaHex); // Prevent error on empty path
			var destination = _path.last();
			var x = destination.x + (args.direction === 4 ? magmaSpawn.size - 1 : 0);
			destination = G.grid.hexs[destination.y][x];

			magmaSpawn.moveTo(destination, {
				ignoreMovementPoint: true,
				ignorePath: true,
				callback: function() {
					// Destroy traps along path
					_path.each(function() {
						if (!this.trap) return;
						this.destroyTrap();
					});

					var targetKilled = false;
					if (target !== undefined) {
						var ret = target.takeDamage(damage, true);
						targetKilled = ret.kill;
					}

					// If upgraded and target killed, keep going in the same direction and
					// find the next target to move into
					if (ability.isUpgraded() && targetKilled) {
						var nextPath = G.grid.getHexLine(
							target.x, target.y, args.direction, false);
						nextPath.filterCreature(true, true, magmaSpawn.id);
						// Skip the first hex as it is the same hex as the target
						hurl(nextPath);
					} else {
						var interval = setInterval(function() {
							if(!G.freezedInput) {
								clearInterval(interval);
								G.UI.selectAbility(-1);
								G.activeCreature.queryMove();
							}
						}, 100);
					}
				},
			});
		};
		hurl(path);
	},
}

];
