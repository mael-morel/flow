function GUI(hookSelectorParam, simulation, configuration) {
	hookSelector = hookSelectorParam;
	cache.put(hookSelector +' allColumns', $($$('.tasks td').get().reverse()).toArray());
	this.configuration = configuration;
	this.simulation = simulation;
	this.fps = 4;
	this.lastUpdated = Date.now();
	this.renderTasks = true;
	this.animate = true;
	
	var controls = new Controls(this.simulation, this);
	this.cfdDiagram = new DiagramCFD(this.simulation);
	this.littlesDiagram = new DiagramLittles(this.simulation);
	this.codDiagram = new DiagramCOD(this.simulation);
	this.scatterplotDiagram = new DiagramScatterplot(this.simulation);
	
	this.colors = ['mediumaquamarine', 'lightskyblue', 'lightpink', 'lightgray', 'lightcoral', 'lightblue', 'burlywood', 'antiquewhite', 'silver'];
	this.colorsForColumns = function() {
		var result = {};
		var columnDefs = this.configuration.get("columns.definitions");
		for (var i=0; i<columnDefs.length; i++) {
			result[columnDefs[i].name] = this.colors[i%this.colors.length];
		}
		return result;
	}.bind(this)();
	
	this.stop = function() {
		this.simulation.stop();
		this.cfdDiagram.redraw();
		this.littlesDiagram.redraw();
		this.codDiagram.redraw(true);
		this.scatterplotDiagram.redraw();
		this.update(this.simulation.board, this.simulation.stats, true);
	}
	this.pause = function() {
		this.simulation.pause();
		this.update(this.simulation.board, this.simulation.stats, true);
		ga('send', {
		  hitType: 'event',
		  eventCategory: 'Control',
		  eventAction: 'pause',
		  eventLabel: 'Paused',
		});
	}
	this.play = function() {
		this.simulation.play();
		ga('send', {
		  hitType: 'event',
		  eventCategory: 'Control',
		  eventAction: 'start',
		  eventLabel: 'Started',
		});
	}
	
	$$(".simulation-help").click(function() {
		window.top.location = "https://mgajdzik.com/kanban-flow-simulator/help/";
	});
	
	this.updateURL = function() {
		var url = "" + window.top.location;
		url = url.replace(/simulation-config=[a-zA-Z=0-9]*/, "");
		if (url.indexOf("#") == -1) url = url + "#";
		url = url + "simulation-config=";
		url = url + btoa(JSON.stringify(this.configuration.data));
		window.top.location = url;
	}
	
	$$(".who-works-where input[type=checkbox]").change(function(event){
		var checkbox = event.target;
		var checked = event.target.checked;
		var column = $(event.target).data("columnPermissionsColumn");
		var specialisation = $(event.target).data("columnPermissionsSpecialist");
		var collumnsAllowedToWorkIn = this.configuration.get("team."+specialisation+".columns");
		var newArray;
		if (checked) {
			newArray = collumnsAllowedToWorkIn.slice();
			newArray.push(column);
		} else {
			newArray = collumnsAllowedToWorkIn.slice();
			newArray.splice(collumnsAllowedToWorkIn.indexOf(column), 1);
		}
		this.configuration.set("team." + specialisation + ".columns", newArray);
		this.updateURL();
		ga('send', {
		  hitType: 'event',
		  eventCategory: 'Configuration change',
		  eventAction: "team."+specialisation+".columns",
		});
	}.bind(this));
	
	this.updateColumnsAvailabilityCheckboxes = function() {
		this.configuration.pauseListeners();
		var specialisations = this.configuration.getActiveStates();
		for (var i=0; i < specialisations.length; i++) {
			var checkboxes = $$(".who-works-where input[type=checkbox][data-column-permissions-specialist=" + specialisations[i] + "]");
			var checkboxesToCheck = this.configuration.get("team." + specialisations[i] + ".columns");
			for (var j=0; j<checkboxes.length; j++) {
				var checkbox = $(checkboxes[j]);
				if (checkboxesToCheck.indexOf(checkbox.data("columnPermissionsColumn"))>=0) {
					checkbox.attr('checked','checked');
				} else {
					checkbox.removeAttr('checked');
				}
				
			}
		}
		this.configuration.activateListeners();
	}
	this.updateComponentsDependingOnRunningAverage = function() {
		this.littlesDiagram.redraw();
		this.littlesDiagram.redraw(true);
		this.updateStats();
	}
	
	this.registerConfigurationOnChangeListeners = function() {
		this.configuration.onChange("team.analysis.columns", this.updateColumnsAvailabilityCheckboxes.bind(this));
		this.configuration.onChange("team.development.columns", this.updateColumnsAvailabilityCheckboxes.bind(this));
		this.configuration.onChange("team.qa.columns", this.updateColumnsAvailabilityCheckboxes.bind(this));
		this.configuration.onChange("team.deployment.columns", this.updateColumnsAvailabilityCheckboxes.bind(this));
		this.configuration.afterChange("stats.noOfDaysForMovingAverage", this.updateComponentsDependingOnRunningAverage.bind(this));
		this.configuration.onChange("tasks.arrivalStrategy.current", this.arrivalStrategyChanged.bind(this));
		this.configuration.onChange("tasks.sizeStrategy.current", this.sizeStrategyChanged.bind(this));
	}
	
	this.arrivalStrategyChanged = function(newValue) {
		$$(".backlog-settings-temporal [data-for-option]").hide();
		$$(".backlog-settings-temporal [data-for-option='" + newValue + "']").show();
	}
	
	this.sizeStrategyChanged = function(newValue) {
		$$(".backlog-settings-task-size [data-for-option]").hide();
		$$(".backlog-settings-task-size [data-for-option='" + newValue + "']").show();
	}	

	this.initialiseBacklogStrategies = function() {
		this.arrivalStrategyChanged(this.configuration.get("tasks.arrivalStrategy.current"));
		this.sizeStrategyChanged(this.configuration.get("tasks.sizeStrategy.current"));
	}
	
	var bottomMenuSelectedTab = 0;
	$$(".bottom-menu .nav li").click(function() {
		var navElement = $(this);
		if (navElement.hasClass('active')) return;
		$$(".bottom-menu .nav li:nth-child(" + (bottomMenuSelectedTab +1) + ")").toggleClass("active", false);
		$$(".bottom-menu>div:nth-of-type(" + (bottomMenuSelectedTab +1) + ")").hide(0, function(){
    		$(this).trigger('isHidden');
		});
		bottomMenuSelectedTab = navElement.index();
		$$(".bottom-menu .nav li:nth-child(" + (bottomMenuSelectedTab +1) + ")").toggleClass("active", true);
		$$(".bottom-menu>div:nth-of-type(" + (bottomMenuSelectedTab +1) + ")").show(0, function(){
    		$(this).trigger('isVisible');
		});
	});
	var settingsSelectedTab = 0;
	$$(".simulation-settings-modal .modal-body .nav li").click(function() {
		var navElement = $(this);
		if (navElement.hasClass('active')) return;
		$$(".simulation-settings-modal .modal-body .nav li:nth-child(" + (settingsSelectedTab +1) + ")").toggleClass("active", false);
		$$(".simulation-settings-modal .modal-body>div:nth-of-type(" + (settingsSelectedTab +1) + ")").hide(0, function(){
    		$(this).trigger('isHidden');
		});
		settingsSelectedTab = navElement.index();
		$$(".simulation-settings-modal .modal-body .nav li:nth-child(" + (settingsSelectedTab +1) + ")").toggleClass("active", true);
		$$(".simulation-settings-modal .modal-body>div:nth-of-type(" + (settingsSelectedTab +1) + ")").show(0, function(){
    		$(this).trigger('isVisible');
		});
	});
	
	$$(".bottom-menu>div:not(:nth-of-type(1))").hide();
	$$(".simulation-settings-modal .modal-body>div:not(:nth-of-type(1))").hide();
	
	this.settingsOpened = function() {
		this.wasRunningWhenSettingsOpened = false;
		if (this.simulation.isRunning()) {
			this.wasRunningWhenSettingsOpened = true;
			this.pause();
		}
	}
	this.settingsClosed = function() {
		if (this.wasRunningWhenSettingsOpened) {
			this.play();
		}
	}
	
	$$(".simulation-settings-modal").on("show.bs.modal", this.settingsOpened.bind(this));
	$$(".simulation-settings-modal").on("hide.bs.modal", this.settingsClosed.bind(this));
	
	$$(".tasksDivOverlay").click(function() {
        var divOverlay = $$('.tasksDivOverlay');
        divOverlay.hide();
		this.renderTasks = !this.renderTasks;
		if (this.renderTasks) {
			$$(".tasks-count", false).remove();
		}
		$$(".board-wrapper").toggleClass("board-wrapper-max-height");
		this.updateBoard();

	}.bind(this));
	
	$$(".tasks").mouseover(function() {
        var divOverlay = $$('.tasksDivOverlay');
        var bottomWidth = $(this).css('width');
        var bottomHeight = $(this).css('height');
        var rowPos = $(this).position();
        bottomTop = rowPos.top;
        bottomLeft = rowPos.left;
        divOverlay.css({
            position: 'absolute',
            top: bottomTop,
            right: '0px',
            width: '100%',
            height: bottomHeight
        });
		divOverlay.show();
	});
    $$('.tasksDivOverlay').mouseleave(function() {
        var divOverlay = $$('.tasksDivOverlay');
        divOverlay.hide();
    });
	
	this.update = function(board, stats, force) {
		var now = Date.now();
		if (!force && now - this.lastUpdated < 1000/this.fps) return;
		this.lastUpdated = now;
		this.updateTime();
		this.updateStats();
		this.updateBoard();
		this.cfdDiagram.update();
		this.littlesDiagram.update();
		this.codDiagram.update(force);
		this.scatterplotDiagram.update(force);
	}

	this.updateTime = function() {
		function pad(n) {
		    return (n < 10) ? ("0" + n) : n;
		}
		var time = this.simulation.time;
		$$(".day").text(pad(Math.floor(time / (8 * 60)) + 1));
		$$(".hour").text(pad(Math.floor(time/60) % 8  + 9) + ":" + pad(time % 60));
	}
	
	this.updateStats = function() {
		var stats = this.simulation.stats;
		var wipAvg = stats.wip.getAvg();
		var leadTimeAvg = stats.leadTime.getAvg();
		$$('.stats-wip').text(wipAvg ? wipAvg.toFixed(1) : '-');
		$$('.stats-throughput').text(stats.throughput.getAvg() ? stats.throughput.getAvg().toFixed(1) : '-');
		$$('.stats-lead-time').text(leadTimeAvg ? leadTimeAvg.toFixed(1) : '-');
		$$('.stats-wip-lead-time').text(wipAvg && leadTimeAvg ? (wipAvg / leadTimeAvg).toFixed(1) : '-');
		$$('.stats-utilisation').text(stats.capacityUtilisation.getAvg() ? stats.capacityUtilisation.getAvg().toFixed(1) : '-');
	}
	
	this.updateBoard = function() {
		var board = this.simulation.board;
		var renderTasks = this.renderTasks;
		$$('allColumns').forEach(function(columnVisual) {
			var columnVisualId = columnVisual.className;
			columnVisual = $(columnVisual);
			if (!renderTasks) {
				columnVisual.html("<span class='tasks-count'>" + board.getColumnByName(columnVisualId).tasks.length + "</span>");
			} else {
				columnVisual.children().each(function(index, taskElement) {
					var $task = $(taskElement);
					var task = $task.data("taskReference");
					if (task.column) {
						$task.find('.progress-bar').width((100 * task.size[task.column.name] / task.originalSize[task.column.name]).toFixed(1) + '%');
						$task.find('.task-status').html(this.createStatusSpan(task.peopleAssigned));
					}
					if (!board.tasks[task.id]) {
						$task.remove();
					} else if (task.column && task.column.name != columnVisualId) {
						$task.remove();
						var newTaskInstance = this.createTaskDiv(task);
						$$(".tasks td." + task.column.name).append(newTaskInstance);
						$task = newTaskInstance;
					}
				}.bind(this));
			}
		}.bind(this));
		if (renderTasks) {
			for (var key in board.tasks) {
				if (!board.tasks.hasOwnProperty(key)) {
					continue;
				}
				var task = board.tasks[key];
				if ($$("." + task.id, false).length == 0) {
					var newTask = this.createTaskDiv(task);
					$$('.tasks td.' + task.column.name).append(newTask);
				}
			}
		}
	};
	
	this.createTaskDiv = function(task) {
		var html = "<div class='task " + task.id + (this.animate?" task-animation" : "") + "'>" + task.label + " <div class='task-status'>" + this.createStatusSpan(task.peopleAssigned)+ "</div><div class='progress'><div class='progress-bar progress-bar-info' style='width:100%'/></div></div>";
		return $(html).data("taskReference", task);
	}

	this.createStatusSpan = function(peopleWorkingOn) {
		if (peopleWorkingOn.length == 0) {
			return "<span class='glyphicon glyphicon-hourglass waiting'/>";
		}
		var html = "";
		peopleWorkingOn.forEach(function (person) {
			var color = this.colorsForColumns[person.specialisation];
			html += "<span class='glyphicon glyphicon-user person' style='color: " + color + "'/>";
		}.bind(this));
		return html;
	}

	var bindedElements = $$("[data-model]");
	for (var i=0; i<bindedElements.length; i++) {
		var $input = $(bindedElements[i]);
		var key = $input.data("model");
		if (bindedElements[i].type == "checkbox") {
			if (this.configuration.get(key)) {
				$input.attr("checked", "checked");
			} else {
				$input.removeAttr('checked');
			}
		} else {
			$input.val(this.configuration.get(key));
		}
		$input.change(function(event) {
			var newValue = event.target.type == "checkbox" ? event.target.checked : event.target.value;
			if (typeof newValue == "string" && !isNaN(parseFloat(newValue))) {
				newValue = parseFloat(newValue);
			}
			var property = $(event.target).data("model");
			this.configuration.set(property, newValue);
			this.updateURL();
			ga('send', {
			  hitType: 'event',
			  eventCategory: 'Configuration change',
			  eventAction: property,
			});
		}.bind(this));
	}
}