function GUI(hookSelector, simulation, cache) {
	this.cache = cache;
	this.hookSelector = hookSelector;
	function $$(selector, useCache) {
		if (useCache == undefined || useCache) {
			return cache.get(hookSelector +" " + selector);
		}
		return $(hookSelector +" " + selector);
	};
	
	this.simulation = simulation;
	this.fps = 4;
	this.lastUpdated = Date.now();
	
	this.cache.put(hookSelector +' allColumns', $($$('.tasks td').get().reverse()).toArray());
	this.renderTasks = true;

	$$('.timescale').slider({
		min: 50,
		max: 100000,
		scale: 'logarithmic',
		step: 5,
		value: 100,
		tooltip: 'hide',
	}).on("slide", function(event) {
		simulation.hourLengthInSeconds = 100 / event.value;
	}).on("slideStop", function(event) {
		simulation.hourLengthInSeconds = 100 / event.value;
	});

	$$(".stop").click(function() {
		simulation.stop();
		lastUpdatedCFDDay = -1;
		lastUpdatedLittlesDay = -1;
	});
	$$(".pause").click(function() {
		simulation.pause();
	});
	$$(".play").click(function() {
		simulation.play();
	});
	var specialisations = ["analysis", "development", "qa", "deployment"];
	specialisations.findFromArray = function(otherArray) {
		for (var i = 0; i < otherArray.length; i++) {
			if (specialisations.indexOf(otherArray[i]) != -1) {
				return otherArray[i];
			}
		}
	}
	$$(".headcount input[type=checkbox]").change(function(event){
		var checkbox = event.target;
		var checked = event.target.checked;
		var column = specialisations.findFromArray(checkbox.parentElement.className.split(" "));
		var specialisation = specialisations.findFromArray(checkbox.parentElement.parentElement.className.split(" "));
		simulation.updateColumnsAvailabilityForSpecialisation(specialisation, column, checked);
	});
	$$("input[type=text].headcount").change(function(event){
		var specialisation = specialisations.findFromArray(event.target.parentElement.className.split(" "));
		var newHeadcount = event.target.value;
		simulation.updateHeadcount(specialisation, newHeadcount);
	});
	$$(".simulation-settings-general .settings-no-of-tasks").change(function(event) {
		var newValue = event.target.value;
		simulation.maxTasksOnOnePerson = newValue;
	});
	$$(".simulation-settings-general .settings-no-of-people").change(function(event) {
		var newValue = event.target.value;
		simulation.maxPeopleOnOneTask = newValue;
	});	
	
	$$(".backlog-settings-temporal .backlog-settings-temporal-strategy").change(function(event) {
		var newValue = event.target.value;
		simulation.temporalTaskStrategyChanged(newValue);
	});	
	
	$$(".backlog-settings-task-size .backlog-settings-task-size-strategy").change(function(event) {
		var newValue = event.target.value;
		simulation.taskSizeStrategyChanged(newValue);
	});	
	
	
	var currentlySelected = 0;
	$$(".bottom-menu .nav li").click(function() {
		var navElement = $(this);
		if (navElement.hasClass('active')) return;
		$$(".bottom-menu .nav li:nth-child(" + (currentlySelected +1) + ")").toggleClass("active", false);
		$$(".bottom-menu>div:nth-of-type(" + (currentlySelected +1) + ")").hide(0, function(){
    		$(this).trigger('isHidden');
		});
		currentlySelected = navElement.index();
		$$(".bottom-menu .nav li:nth-child(" + (currentlySelected +1) + ")").toggleClass("active", true);
		$$(".bottom-menu>div:nth-of-type(" + (currentlySelected +1) + ")").show(0, function(){
    		$(this).trigger('isVisible');
		});
	});
	
	$$(".simulation-settings").click(function() {
		$$(".simulation-settings-div").slideFadeToggle();
	});
	
	$$(".backlog-settings").click(function() {
		$$(".backlog-settings-div").slideFadeToggle();
	});

	$$(".simulation-cfd-tab").CanvasJSChart({
      title:{
        text: "Cumulative Flow Diagram (CFD)"  
      },
	  backgroundColor: null,
	  zoomEnabled: true,
	  zoomType: "x",
	  legend: {
          horizontalAlign: "left", // "center" , "right"
          verticalAlign: "top",  // "top" , "bottom"
          fontSize: 15,
		  dockInsidePlotArea: true
      },
	  toolTip: {
     	shared: "true",
		contentFormatter: function (e) {
			var content = "Day: <strong>" + e.entries[0].dataPoint.x + "</strong><br/>";
			for (var i = e.entries.length - 1; i >= 0; i--) {
				content += e.entries[i].dataSeries.name + ": <strong>" + e.entries[i].dataPoint.y + "</strong><br/>";
			}
			return content;
		},
	  },
	  axisX:{
	    minimum: 0,
	  },
	  axisY:{
		  minimum: 0,
		  includeZero: false,
	  },
	  rangeChanged: function(e){
		 var indexOfLowestElement = Math.floor(e.axisX.viewportMinimum);
		 e.chart.options.axisY.minimum=e.chart.options.data[0].dataPoints[indexOfLowestElement].y;
		 e.chart.render();
	  },
      data: [{        
          type: "stackedArea", //or stackedColumn
		  dataPoints: [],
		  name: "Done",
		  showInLegend: true,
		  color: "gray",
      },{        
          type: "stackedArea", //or stackedColumn
          dataPoints: [],
		  name: "Deployment",
		  showInLegend: true,
		  color: "#acc",
      },{        
          type: "stackedArea", //or stackedColumn
          dataPoints: [],
		  name: "QA",
		  showInLegend: true,
		  color: "#cac",
      },{        
          type: "stackedArea", //or stackedColumn
          dataPoints: [],
		  name: "Development",
		  showInLegend: true,
		  color: "#aca",
      },{        
          type: "stackedArea", //or stackedColumn
          dataPoints: [],
		  name: "Analysis",
		  showInLegend: true,
		  color: "#aac",
      }
      ]
    });
	$$(".simulation-cfd-tab").bind('isVisible', function() {
		updateCFD(this.simulation.time, this.simulation.stats)
	}.bind(this));
	
	$$(".simulation-littles-tab").CanvasJSChart({
	  backgroundColor: null,
	  zoomEnabled: true,
	  zoomType: "x",
	  axisX:{
	    minimum: 0,
	  },
	  axisY:{
		  minimum: 0
	  },
	  toolTip: {
     	 shared: "true",
  		contentFormatter: function (e) {
  			var content = "Day: <strong>" + Math.floor(e.entries[0].dataPoint.x / 8) + "</strong>, hour: <strong>" + (e.entries[0].dataPoint.x % 8 + 1) + "</strong><br/>";
  			for (var i = 0; i< e.entries.length; i++) {
				if (!isNaN(e.entries[i].dataPoint.y))
					content += e.entries[i].dataSeries.name + ": <strong>" + e.entries[i].dataPoint.y.toFixed(1) + "</strong><br/>";
  			}
  			return content;
  		},
	  },
	  legend: {
          horizontalAlign: "left", // "center" , "right"
          verticalAlign: "top",  // "top" , "bottom"
          fontSize: 15,
		  dockInsidePlotArea: true
      },
      data: [{        
          type: "line",
		  name: "WIP",
		  dataPoints: [],
		  showInLegend: true,
      },{        
          type: "line",
    	  name: "Throghput",
          dataPoints: [],
		  showInLegend: true,
      },{        
          type: "line",
		  name: "Lead Time",
          dataPoints: [],
		  showInLegend: true,
      },
      ]
    });
	$$(".simulation-littles-tab").bind('isVisible', function() {
		updateLittles(this.simulation.time, this.simulation.stats)
	}.bind(this));
	
	$$(".bottom-menu div:not(:nth-of-type(1))").hide();
	
	$$(".tasksDivOverlay").click(function() {
        var divOverlay = $$('.tasksDivOverlay');
        divOverlay.hide();
		this.renderTasks = !this.renderTasks;
		if (this.renderTasks) {
			$$(".tasks-count", false).remove();
		}
		$$(".board-wrapper").toggleClass("board-wrapper-max-height");
		updateBoard(this.simulation.board, this.renderTasks);

	}.bind(this));
	
	$(".tasks").mouseover(function() {
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
    $('.tasksDivOverlay').mouseleave(function() {
        var divOverlay = $$('.tasksDivOverlay');
        divOverlay.hide();
    });
	
	this.getLimitForColumn = function (columnName) {
		var input = $$("." + columnName + "Header input");
		var result = Number.POSITIVE_INFINITY;
		if (input.length) {
			result = !parseInt(input.val()) ? Number.POSITIVE_INFINITY : Math.abs(parseInt(input.val()));
		}
		return result;
	}
	
	this.getHeadcount = function() {
		var result = [];
		$$("input[type=text].headcount").toArray().forEach(function(element) {
			result.push([specialisations.findFromArray(element.parentElement.className.split(" ")), element.value]);
		});
		return result;
	}
	
	this.getColumnsAvailability = function() {
		var checkboxes = $$(".headcount input[type=checkbox]").toArray();
		var result = {'development': [], 'analysis': [], 'qa': [], 'deployment': []};
		checkboxes.forEach(function (checkbox) {
			if(checkbox.checked) {
				var column = specialisations.findFromArray(checkbox.parentElement.className.split(" "));
				var specialisation = specialisations.findFromArray(checkbox.parentElement.parentElement.className.split(" "));
				result[specialisation].push(column);
			}	
		});
		return result;
	}
	
	this.update = function(board, stats, force) {
		var now = Date.now();
		if (!force && now - this.lastUpdated < 1000/this.fps) return;
		this.lastUpdated = now;
		updateTime(this.simulation.time, this.cache);
		updateStats(stats, this.cache);
		updateBoard(board, this.renderTasks);
		updateCFD(this.simulation.time, stats);
		updateLittles(this.simulation.time, stats);
	}

	function updateTime(time, cache) {
		function pad(n) {
		    return (n < 10) ? ("0" + n) : n;
		}
		$$(".day").text(pad(Math.floor(time / (8 * 60)) + 1));
		$$(".hour").text(pad(Math.floor(time/60) % 8  + 9) + ":" + pad(time % 60));
	}
	
	function updateStats(stats, cache) {
		var wipAvg = stats.getWipAvg();
		var leadTimeAvg = stats.getLeadTimeAvg();
		$$('.stats-wip').text(wipAvg ? wipAvg.toFixed(1) : '-');
		$$('.stats-throughput').text(stats.getThroughputAvg() ? stats.getThroughputAvg().toFixed(1) : '-');
		$$('.stats-lead-time').text(leadTimeAvg ? leadTimeAvg.toFixed(1) : '-');
		$$('.stats-wip-lead-time').text(wipAvg && leadTimeAvg ? (wipAvg / leadTimeAvg).toFixed(1) : '-');
	}
	
	var lastUpdatedCFDDay = 0;
	function updateCFD(time, stats) {
		var tab = $$(".simulation-cfd-tab:visible", false);
		if (tab.length == 0) {
			return;
		}
		var currentDay = Math.floor(time / (60 * 8));
		if (currentDay <= lastUpdatedCFDDay) return;
		lastUpdatedCFDDay = currentDay;
		for (var i=0; i<stats.cfdData.length; i++) {
			tab.CanvasJSChart().options.data[stats.cfdData.length - i - 1].dataPoints = stats.cfdData[i];
		}
		tab.CanvasJSChart().render();
	}
	
	
	var lastUpdatedLittlesDay = 0;
	function updateLittles(time, stats) {
		var tab = $$(".simulation-littles-tab:visible", false);
		if (tab.length == 0) {
			return;
		}
		var currentDay = Math.floor(time / (60 * 8));
		if (currentDay <= lastUpdatedLittlesDay) return;
		lastUpdatedLittlesDay = currentDay;
		var diagramData = tab.CanvasJSChart().options.data;
		diagramData[0].dataPoints = stats.wipAvgHistory;
		diagramData[1].dataPoints = stats.throughputAvgHistory;
		diagramData[2].dataPoints = stats.leadTimeAvgHistory;
		tab.CanvasJSChart().render();
	}
	
	function updateBoard(board, renderTasks) {
		$$('allColumns').forEach(function(columnVisual) {
			var columnVisualId = columnVisual.className;
			columnVisual = $(columnVisual);
			if (!renderTasks) {
				columnVisual.html("<span class='tasks-count'>" + board.getColumnByName(columnVisualId).tasks.length + "</span>");
			} else {
				columnVisual.children().each(function() {
					var taskVisual = $(this);
					var task = taskVisual.data("taskReference");
					if (task.column) {
						taskVisual.find('.progress-bar').width((100 * task[task.column.name] / task[task.column.name + 'Original']).toFixed(1) + '%');
						taskVisual.find('.task-status').html(createStatusSpan(task.peopleAssigned));
					}
					if (!board.tasks[task.id]) {
						taskVisual.remove();
					} else if (task.column && task.column.name != columnVisualId) {
						taskVisual.remove();
						var newTaskInstance = createTaskDiv(task);
						$$(".tasks td." + task.column.name).append(newTaskInstance);
						taskVisual = newTaskInstance;
					}
				});
			}
		});
		if (renderTasks) {
			for (var key in board.tasks) {
				if (!board.tasks.hasOwnProperty(key)) {
					continue;
				}
				var task = board.tasks[key];
				if ($$("." + task.id, false).length == 0) {
					var newTask = createTaskDiv(task);
					$$('.tasks td.' + task.column.name).append(newTask);
				}
			}
		}
	};
	
	function createTaskDiv(task) {
		var html = "<div class='task " + task.id + "'>" + task.label + " <div class='task-status'>" + createStatusSpan(task.peopleAssigned)+ "</div><div class='progress'><div class='progress-bar progress-bar-info' style='width:100%'/></div></div>";
		return $(html).data("taskReference", task);
	}
	function createStatusSpan(peopleWorkingOn) {
		if (peopleWorkingOn.length == 0) {
			return "<span class='glyphicon glyphicon-hourglass waiting'/>";
		}
		var html = "";
		peopleWorkingOn.forEach(function (person) {
			html += "<span class='glyphicon glyphicon-user person " +person.specialisation + "'/>";
		});
		return html;
	}
}

function Cache() {
	this.cache = {};
	this.get = function(query) {
		var value = this.cache[query];
		if (value) return value;
		var jquery = $(query);
		this.cache[query] = jquery;
		return jquery;
	}
	
	this.put = function(query, value) {
		this.cache[query] = value;
	}
}

$.fn.slideFadeToggle = function(easing, callback) {
  return this.animate({ opacity: 'toggle', height: 'toggle' }, 'fast', easing, callback);
};