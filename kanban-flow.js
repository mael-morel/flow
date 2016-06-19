$(document).ready(function() {
	new Simulation(".kanban-board");
});

function Simulation(hookSelector) {
	this.hourLengthInSeconds = 1;
	this.ticksPerHour = 12;
	this.time;
	this.taskCounter;
	this.timeoutHandler;
	this.gui = new GUI(hookSelector, this, new Cache());
	this.board;
	this.stats;
	this.team;
	this.maxTasksOnOnePerson = 2;
	this.maxPeopleOnOneTask = 2;
	
	this.initBasics = function() {
		this.time = 0;
		this.taskCounter = 1;
		this.team = new Team();
		this.board = new Board(this.ticksPerHour, this);
		this.stats = new Stats(this);
		this.gui.update(this.board, this.stats, true);
		this.gui.getHeadcount().forEach(function (newHeadcount) {
			this.team.updateHeadcount(newHeadcount[0], newHeadcount[1]);
		}.bind(this));
		this.team.allowedToWorkIn = this.gui.getColumnsAvailability();
		var generalSettings = this.gui.getGeneralSettings();
		this.gui.initialiseBacklogStrategies();
		this.maxTasksOnOnePerson = generalSettings['maxTasksOnOnePerson'];
		this.maxPeopleOnOneTask = generalSettings['maxPeopleOnOneTask'];
		this.stats.changeNoOfDaysForCountingAverages(generalSettings['noOfDaysForCountingAverages']);
		this.team.workingOutOfSpecialisationCoefficient = generalSettings['productivityOfWorkingNotInSpecialisation'];
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
		this.board.updateColumnsLimitsFrom(this.gui);
		this.addNewTasks(this.board);
		this.doWork();
		this.moveTasks(this.board.columns);
		this.assignTeamMembersToTasks();
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
		"demand-equals-throughput": function(createTaskFunction) {
			if (this.board.columns[0].tasks.length == 0)
				this.board.addTask(createTaskFunction(this.taskCounter++, this.time));
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
				var noOfTasksToSpawn = Math.round(normal_random(batchSize, batchSize / 3));
				for (var i=0; i < noOfTasksToSpawn; i++) {
					this.board.addTask(createTaskFunction(this.taskCounter++, this.time));
				}
			}
		}.bind(this),
	};
	this.temporalTaskStrategy = "demand-equals-throughput";
	this.temporatTaskStrategyProperties = {};
	
	this.taskSizeStrategies = {
		"constant": function(id, time) {
			return new Task(id, time, this.taskSizeStrategyProperties["analysis"], this.taskSizeStrategyProperties["development"], this.taskSizeStrategyProperties["qa"], this.taskSizeStrategyProperties["deployment"]);
		}.bind(this), 
		"normal": function(id, time) {
			return new Task(id, time, normal_random(this.taskSizeStrategyProperties["analysis"], this.taskSizeStrategyProperties["analysis-variation"]), normal_random(this.taskSizeStrategyProperties["development"], this.taskSizeStrategyProperties["development-variation"]), normal_random(this.taskSizeStrategyProperties["qa"], this.taskSizeStrategyProperties["qa-variation"]), normal_random(this.taskSizeStrategyProperties["deployment"], this.taskSizeStrategyProperties["deployment-variation"]));
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
	
	this.changeNoOfDaysForCountingAverages = function(newNoOfDays) {
		this.stats.changeNoOfDaysForCountingAverages(newNoOfDays);
	}

	this.addNewTasks = function() {
		this.temporalTaskStrategies[this.temporalTaskStrategy](this.taskSizeStrategies[this.taskSizeStrategy]);
	}
	function normal_random(mean, variance) {
	  if (mean == undefined)
	    mean = 0.0;
	  mean = 1.0 * mean;
	  if (variance == undefined)
	    variance = 1.0;
	  variance = 1.0 * variance;
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
	  } while (X <= 0);
	  return X;
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
		if (this.time % (60 * 8) == 0) this.board.removeDoneTasks();
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
			for (; i < tasksWithNoAssignee.length && workingPpl.length > 0 &&workingPpl[j].tasksWorkingOn.length < this.maxTasksOnOnePerson; i++) {
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
			for (; i< notWorkingPpl.length && tasks.length > 0 && tasks[j].peopleAssigned.length < this.maxPeopleOnOneTask; i++) {
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
	
	this.updateHeadcount = function(specialisation, newHeadcount) {
		this.team.updateHeadcount(specialisation, newHeadcount);
	}
	
	this.changeProductivityOfWorkingNotInSpecialisation = function(newValue) {
		this.team.workingOutOfSpecialisationCoefficient = newValue;
	}
	
	this.initBasics();
}

function Team() {
	this.members = [];
	this.removedButWorking = [];
	this.allowedToWorkIn = {
		'analysis': ['analysis'],
		'development': ['development'],
		'qa': ['qa'],
		'deployment': ['deployment']
	};
	this.workingOutOfSpecialisationCoefficient = 1;
	
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
	
	this.updateColumnsAvailabilityForSpecialisation = function(specialisation, column, allowFlag) {
		var collumnsAllowedToWorkIn = this.allowedToWorkIn[specialisation];
		if (allowFlag) {
			collumnsAllowedToWorkIn.push(column);
		} else {
			collumnsAllowedToWorkIn.splice(collumnsAllowedToWorkIn.indexOf(column), 1);
		}
	}
	
	this.updateHeadcount = function(specialisation, newHeadcount) {
		var specialists = this.members.filter(function (person) {
			return person.specialisation == specialisation;
		});
		if (specialists.length < newHeadcount) {
			for (var i = 0; i < newHeadcount - specialists.length; i++) {
				this.members.push(new Person(specialisation, this));
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
}

function Person(specialisation, team) {
	this.specialisation = specialisation;
	this.tasksWorkingOn = [];
	this.productivityPerHour = 60;
	this.team = team;
	this.markedAsRemoved = false;
	
	this.assignTo = function(task) {
		this.tasksWorkingOn.push(task);
		task.peopleAssigned.push(this);
	}
	
	this.work = function(ticksPerHour) {
		if (this.tasksWorkingOn.length == 0) return;
		var workPerTask = this.productivityPerHour / this.tasksWorkingOn.length / ticksPerHour;
		this.tasksWorkingOn.forEach(function(task) {
			if (task.column.name != specialisation) {
				task.work(workPerTask * this.team.workingOutOfSpecialisationCoefficient);
			} else {
				task.work(workPerTask);
			}
			if (task.finished()) {
				task.unassignPeople();
			}
		}.bind(this));
	}
	
	this.isAllowedToWorkIn = function(columnName) {
		return this.team.allowedToWorkIn[this.specialisation].indexOf(columnName) != -1;
	}
} 

function Board(ticksPerHour, simulation) {
	this.columns = null;
	this.tasks = {};
	this.ticksPerHour = ticksPerHour;
	
	createColumns(this, simulation);
	
	this.lastColumn = function() {
		return this.columns[this.columns.length - 1];
	}
	
	this.addTask = function(task) {
		this.columns[0].addTask(task);
		this.tasks[task.id] = task;
	}
	
	this.removeDoneTasks = function() {
		var lastColumn = this.columns[this.columns.length - 1];
		lastColumn.tasks.forEach(function(task) {
			task.column = null;
			delete this.tasks[task.id];
		}.bind(this));
		lastColumn.tasks = [];
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
		var tasks = this.lastColumn().tasks;
		var colunName = this.lastColumn().name;
		if (!start || !end)
			return tasks.length;
		var count = 0;
		for (var i=0; i < tasks.length; i++) {
			var timeFinished = tasks[i].arrivalTime[colunName];
			if(timeFinished > start && timeFinished <= end) count++;
		}
		return count;
	}
	
	this.updateColumnsLimitsFrom = function(gui) {
		var updateColumnLimit = function(column) {
			if (!column) return;
			column.limit = gui.getLimitForColumn(column.name);
		}

		this.columns.forEach(function(column) {
			updateColumnLimit(column);
			updateColumnLimit(column.parent);
		});

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
	
	this.finished = function (column) {
		if (!column) {
			column = this.column;
		}
		return this[column.name] <= 0 || !this[column.name];
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
}

function Column(name, queue, simulation, label, shortLabel) {
	this.name = name;
	this.limit = Number.POSITIVE_INFINITY;
	this.tasks = [];
	this.children = [];
	this.parent = null;
	this.ignoreLimit = false;
	this.queue = queue;
	this.simulation = simulation;
	this.label = label;
	this.shortLabel = shortLabel;
	
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
		var limit = this.limit;
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
}

function Stats(simulation) {
	this.leadTimes = [];
	this.wipCount = [];
	this.tasksFinished = [];
	this.availablePeople = [];
	this.busyPeople = [];
	this.capacityUtilisation = [];
	this.cfdData = {}; // [[{time, value},{time, value}][{time, value},{time, value}][]]
	this.dataPointsToRemember = 8  * 5; // hours * days
	this.wipAvg = null;
	this.wipAvgHistory = [];
	this.throughputAvg = null;
	this.throughputAvgHistory = [];
	this.leadTimeAvg = null;
	this.leadTimeAvgHistory = [];
	this.capacityUtilisationAvg = null;
	this.capacityUtilisationAvgHistory = [];
	
	for (var i=0; i<simulation.board.columns.length; i++) {
		this.cfdData[simulation.board.columns[i].name] = [];
	}
	
	this.changeNoOfDaysForCountingAverages = function(newNoOfDays) {
		newNoOfDays = parseInt(newNoOfDays);
		if (Number.isNaN(newNoOfDays) || newNoOfDays <= 0) return;
		this.dataPointsToRemember = newNoOfDays * 8;
		
		var recalculate = function(array, avgFunction) {
			var newArray = [];
			for (var i=0; i<array.length; i++) {
				newArray.push({x: i, y:avgFunction(i, true)});
			}
			return newArray;
		}.bind(this);
		this.wipAvgHistory = recalculate(this.wipCount, this.getWipAvg.bind(this));
		this.throughputAvgHistory = recalculate(this.tasksFinished, this.getThroughputAvg.bind(this));
		this.leadTimeAvgHistory = recalculate(this.leadTimes, this.getLeadTimeAvg.bind(this));
		this.capacityUtilisationAvgHistory = recalculate(this.capacityUtilisation, this.getCapacityUtilisationAvg.bind(this));
	}
	
	this.getWipAvg = function(index, forceRecalculate) {
		index = index == undefined ? this.wipCount.length - 1 : index;
		this.wipAvg = !forceRecalculate && this.wipAvg || this.wipCount.slice(Math.max(0, index - this.dataPointsToRemember), index).average();
		return this.wipAvg;
	}
	
	this.getThroughputAvg = function(index, forceRecalculate) {
		index = index == undefined ? this.tasksFinished.length - 1 : index;
		this.throughputAvg = !forceRecalculate && this.throughputAvg || this.tasksFinished.slice(Math.max(0, index - this.dataPointsToRemember), index).average() * 8;
		return this.throughputAvg;
	}
	
	this.getLeadTimeAvg = function(index, forceRecalculate) {
		index = index == undefined ? this.leadTimes.length - 1 : index;
		this.leadTimeAvg = !forceRecalculate && this.leadTimeAvg ||  ([].concat.apply([], this.leadTimes.slice(Math.max(0, index - this.dataPointsToRemember), index))).average() / (8 * 60);
		return this.leadTimeAvg;
	}
	
	this.getCapacityUtilisationAvg = function(index, forceRecalculate) {
		index = index == undefined ? this.capacityUtilisation.length - 1 : index;
		this.capacityUtilisationAvg = !forceRecalculate && this.capacityUtilisationAvg ||  this.capacityUtilisation.slice(Math.max(0, index - this.dataPointsToRemember), index).average();
		return this.capacityUtilisationAvg;
	}
	
	this.recalculateStats = function(simulation) {
		this.calculateAvailablePeople(simulation);
		if (simulation.time % 60 != 0) return;
		this.updateCfdData(simulation.board, simulation.time);
		this.wipAvg = null;
		this.throughputAvg = null;
		this.leadTimeAvg = null;
		this.capacityUtilisationAvg = null;
		var lastColumn = simulation.board.lastColumn();
		var leadTimes = [];
		this.leadTimes.push(leadTimes);
		lastColumn.tasks.forEach(function(task) {
			leadTimes.push(task.arrivalTime[lastColumn.name] - task.created);
		});
		this.tasksFinished.push(simulation.board.getDoneTasksCount(simulation.time - 60, simulation.time));
		this.wipCount.push(simulation.board.getCurrentWip());
		
		this.availablePeople.push(this.notWorkingCountSummed / simulation.ticksPerHour);
		this.busyPeople.push(this.busyCountSummed / simulation.ticksPerHour);
		var lastPos = this.busyPeople.length - 1;
		this.capacityUtilisation.push(100 * this.busyPeople[lastPos] / (this.busyPeople[lastPos] + this.availablePeople[lastPos]));
		this.notWorkingCountSummed = 0;
		this.busyCountSummed = 0;
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
		this.wipAvgHistory.push({x: time / 60, y: this.getWipAvg()});
		this.throughputAvgHistory.push({x: time / 60, y: this.getThroughputAvg()});
		this.leadTimeAvgHistory.push({x: time / 60, y: this.getLeadTimeAvg()});
		this.capacityUtilisationAvgHistory.push({x: time / 60, y: this.getCapacityUtilisationAvg()});
	}
	
	this.updateCfdData = function(board, time) {
		if (time % (60 * 8) != 0) return;
		var day = (time/60/8);
		for (var i=0; i<board.columns.length - 1; i++) {
			// if (!this.cfdData[board.columns[i].name]) this.cfdData[board.columns[i].name] = [];
			this.cfdData[board.columns[i].name].push({x: day, y:board.columns[i].tasks.length});
		}
		var lastColumnName = board.columns[board.columns.length - 1].name;
		// if (!this.cfdData[lastColumnName]) this.cfdData[lastColumnName] = [];
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