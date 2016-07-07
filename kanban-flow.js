$(document).ready(function() {
	new Simulation(".kanban-board");
});

function Simulation(hookSelector) {
	function Configuration() {
		this.data = {
			maxTasksOnOnePerson: 2,
			maxPeopleOnOneTask: 2,
			stats: {
				noOfDaysForMovingAverage: 5,
			},
			columns: {
				prioritisationStrategy: "fifo",
				limits: {
					input: null,
					analysis: null,
					analysisDone: null,
					analysisWithQueue: 5,
					development: null,
					developmentDone: null,
					developmentWithQueue: 5,
					qa: null,
					qaDone: null,
					qaWithQueue: 3,
					deployment: 5,
				},
			},
			team: {
				workingOutOfSpecialisationCoefficient: 50,
				analysis: {
					headcount: 2,
					columns: ['analysis'],
				},
				development: {
					headcount: 5,
					columns: ['development'],
				},
				qa: {
					headcount: 3,
					columns: ['qa'],
				},
				deployment: {
					headcount: 1,
					columns: ['deployment'],
				},
			}
		};
		this.listeners = {};
		this.listenersAfter = {};
		this.listenersActive = true;
		
		this.set = function(property, newValue) {
			var path = property.split(".");
			var enclosingObject = this.data;
			for (var i=0; i < path.length - 1; i++) {
				enclosingObject = enclosingObject[path[i]];
			}
			var oldValue = enclosingObject[path[path.length - 1]];
			enclosingObject[path[path.length - 1]] = newValue;
			if (this.listenersActive && oldValue != newValue) {
				var launchListeners = function(list) {
					if (list[property]) {
						for (var i=0; i<list[property].length; i++) {
							list[property][i](newValue, property);
						}
					}
				}
				launchListeners(this.listeners);
				launchListeners(this.listenersAfter);
			}
		}
		this.get = function(property) {
			var path = property.split(".");
			var enclosingObject = this.data;
			for (var i=0; i < path.length - 1; i++) {
				enclosingObject = enclosingObject[path[i]];
			}
			return enclosingObject[path[path.length - 1]];
		}
		this.onChange = function(property, listenerFun) {
			this._onChange(property, listenerFun, this.listeners);
		}
		this.afterChange = function(property, listenerFun) {
			this._onChange(property, listenerFun, this.listenersAfter);
		}
		this._onChange = function(property, listenerFun, list) {
			var listenersForProperty = list[property];
			if (!listenersForProperty) {
				listenersForProperty = [];
				list[property] = listenersForProperty;
			}
			listenersForProperty.push(listenerFun);
		}
		
		this.pauseListeners = function() {
			this.listenersActive = false;
		}
		this.activateListeners = function() {
			this.listenersActive = true;
		}
	}
	this.configuration = new Configuration();
	
	this.hourLengthInSeconds = 1;
	this.ticksPerHour = 12;
	this.time;
	this.taskCounter;
	this.timeoutHandler;
	this.gui = new GUI(hookSelector, this, new Cache(), this.configuration);
	this.board;
	this.stats;
	this.team;

	this.initBasics = function() {
		this.time = 0;
		this.taskCounter = 1;
		this.team = new Team(this.configuration);
		this.board = new Board(this.ticksPerHour, this);
		this.stats = new Stats(this, this.configuration);
		this.team.initHeadcount();
		this.gui.update(this.board, this.stats, true);
		this.gui.updateColumnsAvailabilityCheckboxes();
		//this.team.allowedToWorkIn = this.gui.getColumnsAvailability();
		this.gui.initialiseBacklogStrategies();
	}

	this.play = function() {
		if (!this.timeoutHandler)
			this.timeoutHandler = setTimeout(this.tick.bind(this), this.hourLengthInSeconds * 1000 / this.ticksPerHour);
	}
	
	this.stop = function() {
		clearTimeout(this.timeoutHandler);
		this.timeoutHandler = null;
		this.initBasics();
	}
	
	this.pause = function() {
		clearTimeout(this.timeoutHandler);
		this.timeoutHandler = null;
	}

	this.tick = function() {
		this.timeoutHandler = null;
		this.addNewTasks(this.board);
		this.board.reprioritiseTasks(this.prioritisationStrategies[this.configuration.get("columns.prioritisationStrategy")]);
		this.board.removeTasksOverLimitFromBacklog();
		this.doWork();
		this.moveTasks(this.board.columns);
		this.assignTeamMembersToTasks();
		this.board.accumulateCod();
		this.stats.recalculateStats(this);
		this.removeDoneTasks();
		this.gui.update(this.board, this.stats);
		this.play();
		this.time += 60/this.ticksPerHour;
	}
	
	this.temporalTaskStrategies = {
		"scrum": function(createTaskFunction) {
			var length = this.temporatTaskStrategyProperties['length'];
			var tasks = this.temporatTaskStrategyProperties['tasks'];
			var includeExisting = this.temporatTaskStrategyProperties['include-existing'];
			if  (includeExisting) tasks = tasks - this.board.getCurrentWip();
			if (this.time / (60 * 8) % length == 0) {
				for (var i = 0; i < tasks; i++) {
					this.board.addTask(createTaskFunction(this.taskCounter++, this.time));
				}
			}
		}.bind(this), 
		"up-to-limit": function(createTaskFunction) {
			var limit = this.board.columns[0].limit();
			if (limit == Number.POSITIVE_INFINITY) limit = 1;
			for (var i=this.board.columns[0].tasks.length; i < limit; i++) {
				this.board.addTask(createTaskFunction(this.taskCounter++, this.time));
			}
		}.bind(this),
		"constant-push": function(createTaskFunction) {
			var demand = this.temporatTaskStrategyProperties['demand'];
			var ticksPerDay = 8 * this.ticksPerHour;
			var distanceInTicks = ticksPerDay / demand;
			var tickDuration = 60/this.ticksPerHour;
			var currentTick = (this.time) / tickDuration;
			var deltaIndex = currentTick - Math.floor(currentTick / distanceInTicks) * distanceInTicks;
			var spawnTasks = deltaIndex < 1;
			if (spawnTasks) {
				var noOfTasksToSpawn = 1;
				if (demand > ticksPerDay) {
					noOfTasksToSpawn += Math.floor(demand/ticksPerDay) - 1;
					var distanceInTicks = ticksPerDay / (demand % ticksPerDay);
					var deltaIndex = currentTick - Math.floor(currentTick / distanceInTicks) * distanceInTicks;
					var spawnTask = deltaIndex < 1;
					noOfTasksToSpawn += spawnTask ? 1 : 0;
				}
				for (var i=0; i < noOfTasksToSpawn; i++) {
					this.board.addTask(createTaskFunction(this.taskCounter++, this.time));
				}
			}
				
		}.bind(this),
		"random-push": function(createTaskFunction) {
			var demand = this.temporatTaskStrategyProperties['demand'];
			var batchSize = this.temporatTaskStrategyProperties['batch-size'];
			var ticksPerDay = 8 * this.ticksPerHour;
			var probabilityOfSpawningNow = demand / ticksPerDay / batchSize;
			if (Math.random() < probabilityOfSpawningNow) {
				batchSize = Math.max(demand / ticksPerDay, batchSize);
				var noOfTasksToSpawn = Math.max(0, Math.round(normal_random(batchSize, batchSize / 3, true)));
				for (var i=0; i < noOfTasksToSpawn; i++) {
					this.board.addTask(createTaskFunction(this.taskCounter++, this.time));
				}
			}
		}.bind(this),
	};
	this.temporalTaskStrategy = "up-to-limit";
	this.temporatTaskStrategyProperties = {};
	
	this.taskSizeStrategies = {
		"constant": function(id, time) {
			return new Task(id, time, this.taskSizeStrategyProperties["analysis"], this.taskSizeStrategyProperties["development"], this.taskSizeStrategyProperties["qa"], this.taskSizeStrategyProperties["deployment"]);
		}.bind(this), 
		"normal": function(id, time) {
			return new Task(id, time, normal_random(this.taskSizeStrategyProperties["analysis"], this.taskSizeStrategyProperties["analysis-variation"]), normal_random(this.taskSizeStrategyProperties["development"], this.taskSizeStrategyProperties["development-variation"]), normal_random(this.taskSizeStrategyProperties["qa"], this.taskSizeStrategyProperties["qa-variation"]), normal_random(this.taskSizeStrategyProperties["deployment"], this.taskSizeStrategyProperties["deployment-variation"]));
		}.bind(this),
		"tshirt": function(id, time) {
			var smallProbability = parseFloat(this.taskSizeStrategyProperties["small-probability"]);
			var mediumProbability = parseFloat(this.taskSizeStrategyProperties["medium-probability"]);
			var largeProbability = parseFloat(this.taskSizeStrategyProperties["large-probability"]);
			var xlargeProbability = parseFloat(this.taskSizeStrategyProperties["xlarge-probability"]);
			var tshirtSizeRandom = Math.random() * (smallProbability + mediumProbability + largeProbability + xlargeProbability);
			var size = "small";
			if (tshirtSizeRandom > smallProbability) size = "medium";
			if (tshirtSizeRandom > smallProbability + mediumProbability) size = "large";
			if (tshirtSizeRandom > smallProbability + mediumProbability + largeProbability) size = "xlarge";
			var totalSize = parseFloat(this.taskSizeStrategyProperties[size + "-effort"]);
			var analysis = parseFloat(this.taskSizeStrategyProperties["analysis"]);
			var development = parseFloat(this.taskSizeStrategyProperties["development"]);
			var qa = parseFloat(this.taskSizeStrategyProperties["qa"]);
			var deployment = parseFloat(this.taskSizeStrategyProperties["deployment"]);
			var sum = analysis + development + qa + deployment;
			analysis = totalSize * analysis / sum;
			development = totalSize * development / sum;
			qa = totalSize * qa / sum;
			deployment = totalSize * deployment / sum;
			return new Task(id, time, normal_random(analysis, analysis / 2), normal_random(development, development / 2),normal_random(qa, qa / 2),normal_random(deployment, deployment / 2));
		}.bind(this),
	};
	this.taskSizeStrategy = "constant";
	this.taskSizeStrategyProperties = {};
	
	this.temporalTaskStrategyChanged = function(newStrategy, properties) {
		this.temporalTaskStrategy = newStrategy;
		this.temporatTaskStrategyProperties = properties;
	}
	
	this.taskSizeStrategyChanged = function(newStrategy, properties) {
		this.taskSizeStrategy = newStrategy;
		this.taskSizeStrategyProperties = properties;
	}
	
	this.prioritisationStrategies = {
		fifo: function(tasksList) {
		},
		value: function(tasksList) {
			tasksList.sort(function(taskA, taskB) {
				return taskB.value.totalValue() - taskA.value.totalValue();
			}.bind(this));
		}.bind(this),
		cd3: function(tasksList) {
			tasksList.sort(function(taskA, taskB) {
				return taskB.value.costOfDelay(this.time, this.stats.leadTime.getAvg())/taskB.getRemainingWork() - taskA.value.costOfDelay(this.time, this.stats.leadTime.getAvg())/taskA.getRemainingWork();
			}.bind(this));
		}.bind(this)
	};

	this.addNewTasks = function() {
		this.temporalTaskStrategies[this.temporalTaskStrategy](this.taskSizeStrategies[this.taskSizeStrategy]);
	}
	this.moveTasks = function(columns) {
		var changed = true;
		while (changed) {
			changed = false;
			columns.forEach(function(column) {
				column.tasks.forEach(function(task) {
					if (task.finished()) {
						var nextColumn = this.findNextColumn(task, columns);
						if (nextColumn != column) {
							changed = true;
							column.moveTaskTo(task, nextColumn);
						}
					}
				}.bind(this));
			}.bind(this));
		}
	}
	
	this.removeDoneTasks = function() {
		if (this.time % (60 * 8) == 0) this.board.cleanDoneAndDropped();
	}

	this.findNextColumn = function(task, columns) {
		var column = task.column;
		var index = columns.indexOf(column);
		while (column && task.finished(column) && (!columns[index + 1] || columns[index + 1].availableSpace(task))) {
			column = columns[++index];
		}
		if (!column) {
			// move to done just before removing from the board
			column = columns[columns.length - 1];
		}
		return column;
	}
		/*
		1. Najpierw szukamy zadan do pracy exlusive w kolumnie specjalizacji (zaczynajac od prawej)
		2. Jesli zostaly zadania do pracy w tej kolumnie, szukamy osob nie pracujacych z innymi nad innym zadaniem w kolumnie, wybierajac tych z najmniejsza liczba zadan w toku
		3. Jesli zostali ludzie do pracy w specjalizacji, probojemy ich dodawac do juz pracujacych, wybierajac zadania z najmniejsza liczba ludzi
		4. Jesli zostali ludzie do pracy, bierzemy sie za nastepna specjalizacje i powtarzamy kroki
		5. Po przejsciu wszystkich kolumn, jesli zostali ludzie do pracy (ktorzy nie pracuja nad zadnym zadaniem), probojemy dopasowac ich do innych kolumn zgodnie z pow. algorytmem
		*/
	this.assignTeamMembersToTasks = function() {
		var columns = this.board.columns;
		for (var columnIndex = columns.length - 1; columnIndex>=0; columnIndex--) {
			var column = columns[columnIndex];
			if (column.isQueue()) {
				continue;
			}
			this.assignTeamMembersToTasksBySpecialisation(column, column.name);
		}
		for (var columnIndex = columns.length - 1; columnIndex>=0; columnIndex--) {
			var column = columns[columnIndex];
			if (column.isQueue()) {
				continue;
			}
			this.assignTeamMembersToTasksBySpecialisation(column);
		}
	}
	
	this.assignTeamMembersToTasksBySpecialisation = function(column, specialisation) {
		var notWorkingPpl = this.team.getNotWorkingForColumn(column, specialisation);
		var tasksWithNoAssignee = column.getNotAssignedTasks();
		var i;
		for (i=0; i<notWorkingPpl.length && i<tasksWithNoAssignee.length; i++) {
			notWorkingPpl[i].assignTo(tasksWithNoAssignee[i]);
		}
		var stoppedAtIndex = i;
		if (stoppedAtIndex < tasksWithNoAssignee.length) {
			var workingPpl = this.team.getSpecialistsWorkingInColumnOrderedByTaskCount(column, specialisation);
			var j = 0;
			for (; i < tasksWithNoAssignee.length && workingPpl.length > 0 &&workingPpl[j].tasksWorkingOn.length < this.configuration.get("maxTasksOnOnePerson"); i++) {
				workingPpl[j].assignTo(tasksWithNoAssignee[i]);
				if (workingPpl[j].tasksWorkingOn.length > workingPpl[(j + 1) % workingPpl.length].tasksWorkingOn.length) {
					j = (j + 1) % workingPpl.length;
				} else {
					j = 0;
				}
			}
		} 
		if (stoppedAtIndex < notWorkingPpl.length) {
			i = stoppedAtIndex;
			var peopleWithMoreTasks = this.team.getPeopleAssignedToMoreThanOneTaskOrderderByTaskCountAndSpecialisation(column);
			var j=0;
			for (; i< notWorkingPpl.length && j < peopleWithMoreTasks.length; i++) {
				var person = peopleWithMoreTasks[j];
				var task = person.tasksWorkingOn[0];
				task.unassignPeople();
				notWorkingPpl[i].assignTo(task);
				if (!peopleWithMoreTasks[j + 1] || person.tasksWorkingOn.length < peopleWithMoreTasks[j + 1].tasksWorkingOn.length || person.tasksWorkingOn.length == 1) {
					j++;
				}
			}
			stoppedAtIndex = i;
		}
		if (stoppedAtIndex < notWorkingPpl.length) {
			i = stoppedAtIndex;
			var tasks = column.getTasksAssignedToOneOrMoreOrderedByNumberOfPeople();
			var j=0;
			for (; i< notWorkingPpl.length && tasks.length > 0 && tasks[j].peopleAssigned.length < this.configuration.get("maxPeopleOnOneTask"); i++) {
				notWorkingPpl[i].assignTo(tasks[j]);
				if (tasks[j].peopleAssigned.length > tasks[(j + 1) % tasks.length].peopleAssigned.length) {
					j = (j + 1) % tasks.length;
				} else {
					j = 0;
				}
			}
		}
	}

	this.doWork = function() {	
		this.team.doWork(this.ticksPerHour);
	}
	
	this.updateColumnsAvailabilityForSpecialisation = function(specialisation, column, checked) {
		this.team.updateColumnsAvailabilityForSpecialisation(specialisation, column, checked);
	}
	
	this.initBasics();
}

function Team(configuration) {
	this.members = [];
	this.removedButWorking = [];
	this.configuration = configuration;
	
	this.doWork = function(ticksPerHour) {
		this.members.forEach(function(person) {
			person.work(ticksPerHour);
		});
		this.removedButWorking = this.removedButWorking.filter(function (person) {
			return person.tasksWorkingOn.length != 0;
		})
		this.removedButWorking.forEach(function(person) {
			person.work(ticksPerHour);
		});
	}
	
	this.getNotWorkingForColumn = function(column, specialisation) {
		var result = [];
		this.members.forEach(function(person) {
			if (person.tasksWorkingOn.length == 0 && (!specialisation || person.specialisation == specialisation) && person.isAllowedToWorkIn(column.name)) {
				result.push(person);
			}
		});
		return result;
	}
	
	this.getNotWorking = function() {
		var result = [];
		this.members.forEach(function(person) {
			if (person.tasksWorkingOn.length == 0) result.push(person);
		});
		return result;
	}
	
	this.getSpecialistsWorkingInColumnOrderedByTaskCount = function(column, specialisation) {
		var result = [];
		column.tasks.forEach(function(task) {
			if (task.peopleAssigned.length == 1 && (!specialisation || task.peopleAssigned[0].specialisation == specialisation)) {
				var person = task.peopleAssigned[0];
				if (result.indexOf(person) == -1 && person.isAllowedToWorkIn(column.name) && !person.markedAsRemoved) {
					result.push(person);
				}
			}
		});
		result.sort(function(a, b) {
			return a.tasksWorkingOn.length > b.tasksWorkingOn.length;
		});
		return result;
	}
	
	this.getPeopleAssignedToMoreThanOneTaskOrderderByTaskCountAndSpecialisation = function(column) {
		var result = [];
		column.tasks.forEach(function(task) {
			var person = task.peopleAssigned[0];
			if (task.peopleAssigned.length == 1 && person.tasksWorkingOn.length > 1) {
				if (result.indexOf(person) == -1) {
					result.push(person);
				}
			}	
		});
		result.sort(function(personA, personB) { //TODO: to be tested!
			if (personA.specialisation == personB.specialisation) {
				return personA.tasksWorkingOn.length < personB.tasksWorkingOn.length;
			}
			if (personA.specialisation == column.name) {
				return true;
			}
			if (personB.specialisation == column.name) {
				return false;
			}
			return personA.tasksWorkingOn.length < personB.tasksWorkingOn.length;
		});
		return result;
	}
	
	this.updateHeadcount = function(newHeadcount, attributeChanged) {
		var specialisation = attributeChanged.split(".")[1];
		var specialists = this.members.filter(function (person) {
			return person.specialisation == specialisation;
		});
		if (specialists.length < newHeadcount) {
			for (var i = 0; i < newHeadcount - specialists.length; i++) {
				this.members.push(new Person(specialisation, this, this.configuration));
			}
		} else if (specialists.length > newHeadcount) {
			for (var i = 0; i < specialists.length - newHeadcount; i++) {
				this.members.splice(this.members.indexOf(specialists[i]), 1);
				if (specialists[i].tasksWorkingOn.length > 0) {
					this.removedButWorking.push(specialists[i]);
					specialists[i].markedAsRemoved = true;
				}
			}
		}
	}
	this.configuration.onChange("team.analysis.headcount", this.updateHeadcount.bind(this));
	this.configuration.onChange("team.development.headcount", this.updateHeadcount.bind(this));
	this.configuration.onChange("team.qa.headcount", this.updateHeadcount.bind(this));
	this.configuration.onChange("team.deployment.headcount", this.updateHeadcount.bind(this));
	
	this.initHeadcount = function() {
		this.updateHeadcount(this.configuration.get("team.analysis.headcount"), "team.analysis.headcount");
		this.updateHeadcount(this.configuration.get("team.development.headcount"), "team.development.headcount");
		this.updateHeadcount(this.configuration.get("team.qa.headcount"), "team.qa.headcount");
		this.updateHeadcount(this.configuration.get("team.deployment.headcount"), "team.deployment.headcount");
	}
}

function Person(specialisation, team, configuration) {
	this.specialisation = specialisation;
	this.tasksWorkingOn = [];
	this.productivityPerHour = 60;
	this.team = team;
	this.markedAsRemoved = false;
	this.configuration = configuration;
	
	this.assignTo = function(task) {
		this.tasksWorkingOn.push(task);
		task.peopleAssigned.push(this);
	}
	
	this.work = function(ticksPerHour) {
		if (this.tasksWorkingOn.length == 0) return;
		var workPerTask = this.productivityPerHour / this.tasksWorkingOn.length / ticksPerHour;
		this.tasksWorkingOn.forEach(function(task) {
			if (task.column.name != specialisation) {
				task.work(workPerTask * (this.configuration.get("team.workingOutOfSpecialisationCoefficient") / 100));
			} else {
				task.work(workPerTask);
			}
			if (task.finished()) {
				task.unassignPeople();
			}
		}.bind(this));
	}
	
	this.isAllowedToWorkIn = function(columnName) {
		return this.configuration.get("team." + this.specialisation + ".columns").indexOf(columnName) != -1;
	}
} 

function Board(ticksPerHour, simulation) {
	this.columns = null;
	this.tasks = {};
	this.ticksPerHour = ticksPerHour;
	this.droppedTasks = [];
	
	createColumns(this, simulation);
	
	this.reprioritiseTasks = function(sortTasksFun) {
		for (var i=0; i<this.columns.length -2; i++) {
			sortTasksFun(this.columns[i].tasks);
		}
	}
	
	this.lastColumn = function() {
		return this.columns[this.columns.length - 1];
	}
	
	this.addTask = function(task) {
		this.columns[0].addTask(task);
		this.tasks[task.id] = task;
	}
	
	this.cleanDoneAndDropped = function() {
		var lastColumn = this.columns[this.columns.length - 1];
		lastColumn.tasks.forEach(function(task) {
			task.column = null;
			delete this.tasks[task.id];
		}.bind(this));
		lastColumn.tasks = [];
		this.droppedTasks = [];
	}
	
	this.getCurrentWip = function() {
		return Object.keys(this.tasks).length - this.getDoneTasksCount();
	}
	
	this.getColumnByName = function(columnName) {
		for (var i = 0; i < this.columns.length; i++) {
			if (this.columns[i].name == columnName) {
				return this.columns[i];
			}
		}
	}
	
	this.getDoneTasksCount = function(start, end) {
		return this.getDoneTasks(start, end).length;
	}
	
	this.getDoneTasks = function(start, end) {
		var result = [];
		var tasks = this.lastColumn().tasks;
		var columnName = this.lastColumn().name;
		if (!start || !end)
			return tasks.slice();
		var count = 0;
		for (var i=0; i < tasks.length; i++) {
			var timeFinished = tasks[i].arrivalTime[columnName];
			if(timeFinished > start && timeFinished <= end) result.push(tasks[i]);
		}
		return result;
	}
	
	this.getCostOfDelay = function() {
		var cod = 0;
		var cumulated = 0;
		this.columns.slice(0, this.columns.length - 1).forEach(function(column) {
			column.tasks.forEach(function(task) {
				cod += task.value.costOfDelay(simulation.time);
				cumulated += task.costOfDelayCumulated;
			}.bind(this));
		}.bind(this));
		return {cod: cod, cumulated: cumulated};
	}
	
	this.accumulateCod = function() {
		this.columns.slice(0, this.columns.length - 1).forEach(function(column) {
			column.tasks.forEach(function(task) {
				task.costOfDelayCumulated += task.value.costOfDelay(simulation.time);
			});
		});
	}
	
	this.removeTasksOverLimitFromBacklog = function() {
		var limit = this.columns[0].limit();
		var freshlyRemovedTasks = this.columns[0].tasks.splice(limit, this.columns[0].tasks.length);
		this.droppedTasks = this.droppedTasks.concat(freshlyRemovedTasks);
		freshlyRemovedTasks.forEach(function(task) {
			task.column = null;
			delete this.tasks[task.id];
		}.bind(this));
	}
	
	function createColumns(board, simulation) {
		board.columns = [];
		var columns = board.columns;
		columns.push(new Column("input", true, simulation, "Backlog"));
		Array.prototype.push.apply(columns, createColumnWithChildren("analysis", simulation, "Analysis", "An").children);
		Array.prototype.push.apply(columns, createColumnWithChildren("development", simulation, "Development", "Dev").children);
		Array.prototype.push.apply(columns, createColumnWithChildren("qa", simulation, "QA", "QA").children);
		Array.prototype.push.apply(columns, createColumnWithChildren("deployment", simulation, "Deployment", "Depl").children);
		board.columns[board.columns.length - 1].ignoreLimit = true;
		for (var i=0; i< columns.length; i++) {
			columns[i].index = i;
		}
	}

	function createColumnWithChildren(name, simulation, label, shortLabel) {
		var parentColumn = new Column(name + "WithQueue", false, simulation);
		var column = new Column(name, false, simulation, label, shortLabel);
		column.parent = parentColumn;
		var done = new Column(name + "Done", true, simulation, label + " Done", shortLabel + " D");
		done.parent = parentColumn;
		parentColumn.children.push(column);
		parentColumn.children.push(done);
		return parentColumn;
	}
}

function Task(taskId, time, analysis, development, qa, deployment) {
	this.id = "Task" + taskId;
	this.label = "#" + taskId;
	this.created = time;
	this.analysis = analysis*60;
	this.development = development*60;
	this.qa = qa*60;
	this.deployment = deployment*60;
	this.analysisOriginal = this.analysis;
	this.developmentOriginal = this.development;
	this.qaOriginal = this.qa;
	this.deploymentOriginal = this.deployment;
	this.column = null;
	this.peopleAssigned = [];
	this.arrivalTime = {};
	this.value = new Value(this, time, 10, normal_random(0, 1000));
	
	function Value(task, start, durationInDays, valuePerDay) {
		this.start = start;
		this.end = this.start + durationInDays * 8 * 60;
		this.valuePerDay = valuePerDay;
		this.task = task;
		
		this.costOfDelay = function(now, avgLeadTime) {
			var effort = 0;
			if (task.column.isFirstColumn()) {
				effort = avgLeadTime * 8 * 60 || task.getRemainingWork();
			} else {
				effort = task.getRemainingWork();
			}
			if (now + effort > this.start && now + effort < this.end) {
				return valuePerDay;
			}
			return 0;
		}
		
		this.remainingValue = function(now) {
			return Math.max(0, Math.floor((this.end - Math.max(now, this.start)) / 8)) * this.valuePerDay;
		}
		
		this.currentDailyValue = function(now) {
			if (now > this.start && now < this.end) {
				return valuePerDay;
			}
			return 0;
		}
		
		this.totalValue = function() {
			return Math.floor((this.end - this.start) / 8) * this.valuePerDay
		}
	}
	
	this.finished = function (column) {
		if (!column) {
			column = this.column;
		}
		return this[column.name] <= 0 || !this[column.name];
	}
	
	this.getRemainingWork = function(){
		return Math.max(0, this.analysis) + Math.max(0, this.development) + Math.max(0, this.qa) + Math.max(0, this.deployment);
	}
	
	this.work = function(amount) {
		this[this.column.name] -= amount;
	}
	
	this.unassignPeople = function() {
		this.peopleAssigned.forEach(function(person) {
			person.tasksWorkingOn.splice(person.tasksWorkingOn.indexOf(this), 1);
		}.bind(this));
		this.peopleAssigned = [];
	}
	
	this.getLeadTime = function() {
		return this.arrivalTime[this.column.name] - this.created;
	}
}

function Column(name, queue, simulation, label, shortLabel) {
	this.name = name;
	this.tasks = [];
	this.children = [];
	this.parent = null;
	this.ignoreLimit = false;
	this.queue = queue;
	this.simulation = simulation;
	this.label = label;
	this.shortLabel = shortLabel;
	this.index = -1;
	this.configuration = simulation.configuration;
	
	this.getTasksAssignedToOneOrMoreOrderedByNumberOfPeople = function() {
		var result = [];
		this.tasks.forEach(function(task) {
			if (task.peopleAssigned.every(function(person) {
				return person.tasksWorkingOn.length == 1;
				})) {
					result.push(task);
				}
		});
		result.sort(function(a, b) {
			return a.peopleAssigned.length > b.peopleAssigned.length;
		});
		return result;
	}
	
	this.getNotAssignedTasks = function() {
		var result = [];
		this.tasks.forEach(function(task) {
			if(task.peopleAssigned.length == 0) {
				result.push(task);
			}
		});
		return result;
	}
	
	this.isQueue = function() {
		return queue;
	}
	
	this.addTask = function(task) {
		this.tasks.push(task);
		task.column = this;
		task.arrivalTime[this.name] = this.simulation.time;
	}
	
	this.moveTaskTo = function(task, nextColumn) {
		this.tasks.splice(this.tasks.indexOf(task), 1);
		task.column = nextColumn;
		if (nextColumn) {
			nextColumn.tasks.push(task);
			task.arrivalTime[nextColumn.name] = this.simulation.time;
		}
	}
	
	this.availableSpace = function(task) {
		if (this.ignoreLimit) return true;
		var limit = this.limit();
		var numberOfTasks = this.tasks.length;
		if (this.children.length > 0) {
			//checking for parent column of task
			var indexOfTasksColumn = this.children.indexOf(task.column);
			if (indexOfTasksColumn < 0) {
				this.children.forEach(function(subColumn) {
					if (!subColumn.ignoreLimit)
						numberOfTasks += subColumn.tasks.length;
				});
			}
		}
		return limit - numberOfTasks > 0 && (!this.parent || this.parent.availableSpace(task));
	}
	
	this.limit = function() {
		var limit = this.configuration.get("columns.limits." + this.name);
		var parsed = parseInt(limit);
		return !parsed ? Number.POSITIVE_INFINITY : Math.abs(parsed)
	}
	
	this.isFirstColumn = function() {
		return this.index == 0;
	}
}

function Stats(simulation, configuration) {
	
	function DataSet(stats, interval, avgMultiplier, eventsAsArrays) {
		this.events = [];
		this.avg = null;
		this.avgHistory = [];
		this.interval = interval || 1;
		this.avgMultiplier = avgMultiplier || 1;
		this.stats = stats;
		this.updateHistoryFrom = 0;
		this.eventsAsArrays = eventsAsArrays;
		
		this.getAvg = function(index, forceRecalculate) {
			index = index == undefined ? this.events.length - 1 : index;
			if (forceRecalculate || !this.avg) {
				var subArray = this.events.slice(Math.max(0, index - (this.stats.dataPointsToRemember / this.interval)), index);
				if (eventsAsArrays) {
					subArray = [].concat.apply([], subArray);
				}
				this.avg = subArray.average() * this.avgMultiplier;
			}
			return this.avg;
		}
		
		this.getAvgHistory = function() {
			for (var i=this.updateHistoryFrom; i<this.events.length; i++) {
				this.avgHistory.push({x: i * this.interval, y:this.getAvg(i, true)});
			}
			this.updateHistoryFrom = this.events.length;
			return this.avgHistory;
		}
		
		this.recalculateAvg = function() {
			this.avgHistory = [];
			this.updateHistoryFrom = 0;
		}
		
		this.addEvent = function(event) {
			this.events.push(event);
			this.avg = null;
		}
	}
	
	this.configuration = configuration;
	this.dataPointsToRemember = 8 * this.configuration.get("stats.noOfDaysForMovingAverage"); // hours * days
	this.cfdData = {}; 

	this.wip = new DataSet(this);
	this.throughput = new DataSet(this, 1, 8);
	this.availablePeople = new DataSet(this);
	this.busyPeople = new DataSet(this);
	this.capacityUtilisation = new DataSet(this);
	this.leadTime = new DataSet(this, 1, 1/(8 * 60), true);
	this.costOfDelay = new DataSet(this, 8);
	this.valueDelivered = new DataSet(this, 8);
	this.valueDropped = new DataSet(this, 8);

	this.leadTimesHistory = [];
	
	for (var i=0; i<simulation.board.columns.length; i++) {
		this.cfdData[simulation.board.columns[i].name] = [];
	}
	
	this.changeNoOfDaysForCountingAverages = function(newNoOfDays) {
		newNoOfDays = parseInt(newNoOfDays);
		if (Number.isNaN(newNoOfDays) || newNoOfDays <= 0) return;
		this.dataPointsToRemember = newNoOfDays * 8;
		this.wip.recalculateAvg();
		this.throughput.recalculateAvg();
		this.capacityUtilisation.recalculateAvg();
		this.leadTime.recalculateAvg();
		this.costOfDelay.recalculateAvg();
		this.valueDelivered.recalculateAvg();
		this.valueDropped.recalculateAvg();
	}
	this.configuration.onChange("stats.noOfDaysForMovingAverage", this.changeNoOfDaysForCountingAverages.bind(this));
	
	this.recalculateStats = function(simulation) {
		this.calculateAvailablePeople(simulation);
		if (simulation.time % 60 != 0) return;
		this.updateCfdData(simulation.board, simulation.time);
		
		var lastColumn = simulation.board.lastColumn();
		var leadTimes = [];
		lastColumn.tasks.forEach(function(task) {
			leadTimes.push(task.getLeadTime());
		});
		this.leadTime.addEvent(leadTimes);
		
		this.wip.addEvent(simulation.board.getCurrentWip());
		this.throughput.addEvent(simulation.board.getDoneTasksCount(simulation.time - 60, simulation.time));
		
		this.availablePeople.addEvent(this.notWorkingCountSummed / simulation.ticksPerHour);
		this.busyPeople.addEvent(this.busyCountSummed / simulation.ticksPerHour);		
		var lastPos = this.busyPeople.events.length - 1;
		this.capacityUtilisation.addEvent(100 * this.busyPeople.events[lastPos] / (this.busyPeople.events[lastPos] + this.availablePeople.events[lastPos]));
		this.notWorkingCountSummed = 0;
		this.busyCountSummed = 0;
		
		if (simulation.time % (60*8) == 0) {
			var cod = simulation.board.getCostOfDelay();
			this.costOfDelay.addEvent(cod['cod']);
			var tasksDone = simulation.board.getDoneTasks();
			var valueDelivered = 0;
			for (var i=0; i< tasksDone.length; i++) {
				valueDelivered += tasksDone[i].value.remainingValue(simulation.time);
			}
			this.valueDelivered.addEvent(valueDelivered);
			
			var tasksDropped = simulation.board.droppedTasks;
			var valueDroppedSummed = 0;
			for (var i=0; i< tasksDropped.length; i++) {
				valueDroppedSummed += tasksDropped[i].value.totalValue();
			}
			this.valueDropped.addEvent(valueDroppedSummed);
		}
		this.updateHistory(simulation.time);
		
	}
	
	this.notWorkingCountSummed = 0;
	this.busyCountSummed = 0;
	this.calculateAvailablePeople = function(simulation) {
		var notWorkingCount = simulation.team.getNotWorking().length;
		var teamSize = simulation.team.members.length;
		this.notWorkingCountSummed += notWorkingCount;
		this.busyCountSummed += teamSize - notWorkingCount;
	}
	
	this.updateHistory = function(time) {
		var tasks = simulation.board.getDoneTasks(simulation.time - 60, simulation.time);
		for (var i=0; i< tasks.length; i++) {
			this.leadTimesHistory.push({x: time, y:tasks[i].getLeadTime()/60/8});
		}
	}
	
	this.updateCfdData = function(board, time) {
		if (time % (60 * 8) != 0) return;
		var day = (time/60/8);
		for (var i=0; i<board.columns.length - 1; i++) {
			this.cfdData[board.columns[i].name].push({x: day, y:board.columns[i].tasks.length});
		}
		var lastColumnName = board.columns[board.columns.length - 1].name;
		var lastColumn = this.cfdData[lastColumnName];
		var lastDoneCount = lastColumn[lastColumn.length - 1] ? lastColumn[lastColumn.length - 1].y : 0;
		lastColumn.push({x: day, y:(board.columns[board.columns.length - 1].tasks.length + lastDoneCount)});
	}
}

Array.prototype.average = function(){
	if (this.length == 0) return 0;
	var total = 0;
	for (var i = 0; i < this.length; i++) {
		total += this[i];
	}
	return total / this.length;
}

function normal_random(mean, variance, includeNegatives) {
  if (mean == undefined)
    mean = 0.0;
  mean = 1.0 * mean;
  if (variance == undefined)
    variance = 1.0;
  variance = 1.0 * variance;
  if (mean == 0 && variance == 0) return 0;
  var V1, V2, S, X;
  do {
	  do {
	    var U1 = Math.random();
	    var U2 = Math.random();
	    V1 = 2 * U1 - 1;
	    V2 = 2 * U2 - 1;
	    S = V1 * V1 + V2 * V2;
	  } while (S > 1);
	  X = Math.sqrt(-2 * Math.log(S) / S) * V1;
	  X = mean + Math.sqrt(variance) * X;
  } while (!includeNegatives && X <= 0);
  return X;
}