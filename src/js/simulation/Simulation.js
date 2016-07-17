function Simulation(hookSelector, externalConfig) {
	
	this.configuration = new Configuration(externalConfig);
	
	this.hourLengthInSeconds = 1;
	this.ticksPerHour = 12;
	this.time;
	this.taskCounter;
	this.timeoutHandler;
	this.gui = new GUI(hookSelector, this, this.configuration);
	this.board;
	this.stats;
	this.team;

	this.initBasics = function() {
		this.configuration.clearListeners();
		this.time = 0;
		this.taskCounter = 1;
		this.team = new Team(this.configuration);
		this.board = new Board(this.ticksPerHour, this);
		this.stats = new Stats(this, this.configuration);
		this.team.initHeadcount();
		this.gui.init();
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
	this.isRunning = function() {
		return this.timeoutHandler != null;
	}
	
	this.tick = function() {
		this.timeoutHandler = null;
		this.addNewTasks(this.board);
		this.board.reprioritiseTasks(this.prioritisationStrategies[this.configuration.get("columns.prioritisationStrategy")]);
		this.board.removeTasksOverLimitFromBacklog();
		this.doWork();
		this.moveTasks(this.board.columns);
		this.assignTeamMembersToTasks();
		this.stats.recalculateStats(this);
		this.removeDoneTasks();
		this.gui.update(this.board, this.stats);
		this.play();
		this.time += 60/this.ticksPerHour;
	}
					
	this.taskArrivalStrategies = {
		"scrum": function(createTaskFunction) {
			var length = this.configuration.get('tasks.arrivalStrategy.configs.scrum.length');
			var tasks = this.configuration.get('tasks.arrivalStrategy.configs.scrum.tasks');
			var includeExisting = this.configuration.get('tasks.arrivalStrategy.configs.scrum.include-existing');
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
			var demand = this.configuration.get('tasks.arrivalStrategy.configs.constant-push.demand');
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
			var demand = this.configuration.get('tasks.arrivalStrategy.configs.random-push.demand');
			var batchSize = this.configuration.get('tasks.arrivalStrategy.configs.random-push.batch-size');
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
	
	this.taskSizeStrategies = {
		"constant": function(id, time) {
			var conf = this.configuration.get("tasks.sizeStrategy.configs.constant");
			var activeStates = this.configuration.getActiveStates();
			var taskConfig = {};
			activeStates.forEach(function(element) {
				taskConfig[element] = conf[element] * 60;
			});
			return new Task(id, time, taskConfig);
		}.bind(this), 
		"normal": function(id, time) {
			var conf = this.configuration.get("tasks.sizeStrategy.configs.normal");
			return new Task(id, time, normal_random(conf["analysis"], conf["analysis-variation"]), normal_random(conf["development"], conf["development-variation"]), normal_random(conf["qa"], conf["qa-variation"]), normal_random(conf["deployment"], conf["deployment-variation"]));
		}.bind(this),
		"tshirt": function(id, time) {
			var conf = this.configuration.get("tasks.sizeStrategy.configs.tshirt");
			var smallProbability = parseFloat(conf["small-probability"]);
			var mediumProbability = parseFloat(conf["medium-probability"]);
			var largeProbability = parseFloat(conf["large-probability"]);
			var xlargeProbability = parseFloat(conf["xlarge-probability"]);
			var tshirtSizeRandom = Math.random() * (smallProbability + mediumProbability + largeProbability + xlargeProbability);
			var size = "small";
			if (tshirtSizeRandom > smallProbability) size = "medium";
			if (tshirtSizeRandom > smallProbability + mediumProbability) size = "large";
			if (tshirtSizeRandom > smallProbability + mediumProbability + largeProbability) size = "xlarge";
			var totalSize = parseFloat(conf[size + "-effort"]);
			var analysis = parseFloat(conf["analysis"]);
			var development = parseFloat(conf["development"]);
			var qa = parseFloat(conf["qa"]);
			var deployment = parseFloat(conf["deployment"]);
			var sum = analysis + development + qa + deployment;
			analysis = totalSize * analysis / sum;
			development = totalSize * development / sum;
			qa = totalSize * qa / sum;
			deployment = totalSize * deployment / sum;
			return new Task(id, time, normal_random(analysis, analysis / 2), normal_random(development, development / 2),normal_random(qa, qa / 2),normal_random(deployment, deployment / 2));
		}.bind(this),
	};
	
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
		var sizeStrategy = this.configuration.get("tasks.sizeStrategy.current");
		var arrivalStrategy = this.configuration.get("tasks.arrivalStrategy.current");
		this.taskArrivalStrategies[arrivalStrategy](this.taskSizeStrategies[sizeStrategy]);
	}
	this.moveTasks = function(columns) {
		var changed = true;
		while (changed) {
			changed = false;
			for (var i=0; i<columns.length; i++) {
				var column = columns[i];
				for (var j=0; j<column.tasks.length; j++) {
					var task = column.tasks[j];
					if (task.finished()) {
						var nextColumn = this.findNextColumn(task, columns);
						if (nextColumn != column) {
							changed = true;
							column.moveTaskTo(task, nextColumn);
						}
					}
				}
			}
		}
	}
	
	this.removeDoneTasks = function() {
		if (this.time % (60 * 8) == 0) this.board.cleanDoneAndDropped();
	}

	this.findNextColumn = function(task, columns) {
		var column = task.column;
		var index = column.index;
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