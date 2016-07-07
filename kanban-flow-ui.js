function GUI(hookSelector, simulation, cache, configuration) {
	this.configuration = configuration;
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
		ga('send', {
		  hitType: 'event',
		  eventCategory: 'Control',
		  eventAction: 'speed',
		  eventLabel: 'Speed Changed',
		  eventValue: simulation.hourLengthInSeconds
		});
	});

	$$(".stop").click(function() {
		simulation.stop();
		lastUpdatedCFDDay = -1;
		lastUpdatedLittlesDay = -1;
		lastUpdatedCodDay = -1;
		lastUpdatedScatterPlotDay = -1;
		updateCFDConfiguration.bind(this)();
		this.update(this.simulation.board, this.simulation.stats, true);
		ga('send', {
		  hitType: 'event',
		  eventCategory: 'Control',
		  eventAction: 'stop',
		  eventLabel: 'Stopped',
		});
	}.bind(this));
	$$(".pause").click(function() {
		simulation.pause();
		this.update(this.simulation.board, this.simulation.stats, true);
		ga('send', {
		  hitType: 'event',
		  eventCategory: 'Control',
		  eventAction: 'pause',
		  eventLabel: 'Paused',
		});
	}.bind(this));
	$$(".play").click(function() {
		simulation.play();
		ga('send', {
		  hitType: 'event',
		  eventCategory: 'Control',
		  eventAction: 'start',
		  eventLabel: 'Started',
		});
	});
	
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
	
	$$(".headcount input[type=checkbox]").change(function(event){
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
		var specialisations = ['analysis', 'development', 'qa', 'deployment'];
		for (var i=0; i < specialisations.length; i++) {
			var checkboxes = $$(".headcount input[type=checkbox][data-column-permissions-specialist=" + specialisations[i] + "]");
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
	this.updateDiagramsDependingOnRunningAverage = function() {
		lastUpdatedLittlesDay = -1;
		updateLittles(this.simulation.time, this.simulation.stats);
		lastUpdatedCodDay = -1;
		updateCod(this.simulation.time, this.simulation.stats, true);
	}
	
	this.registerConfigurationOnChangeListeners = function() {
		this.configuration.onChange("team.analysis.columns", this.updateColumnsAvailabilityCheckboxes.bind(this));
		this.configuration.onChange("team.development.columns", this.updateColumnsAvailabilityCheckboxes.bind(this));
		this.configuration.onChange("team.qa.columns", this.updateColumnsAvailabilityCheckboxes.bind(this));
		this.configuration.onChange("team.deployment.columns", this.updateColumnsAvailabilityCheckboxes.bind(this));
		this.configuration.afterChange("stats.noOfDaysForMovingAverage", this.updateDiagramsDependingOnRunningAverage.bind(this));
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

	
	var commonDiagramProperties = {
	  backgroundColor: null,
	  zoomEnabled: true,
	  zoomType: "x",
  	  axisY:{
  		  minimum: 0
  	  },
  	  axisY2:{
  		  minimum: 0,
  	  },
	  axisX:{
	    minimum: 0,
	  },
	  toolTip: {
     	 shared: "true",
	  },
	  legend: {
          horizontalAlign: "left",
          verticalAlign: "top",
          fontSize: 15,
		  dockInsidePlotArea: true
      },
	};

	$$(".simulation-cfd").CanvasJSChart($.extend(true, {}, commonDiagramProperties, {
	  toolTip: {
		contentFormatter: function (e) {
			var content = "Day: <strong>" + (e.entries[0].dataPoint.x + 1) + "</strong><br/>";
			for (var i = e.entries.length - 1; i >= 0; i--) {
				content += e.entries[i].dataSeries.name + ": <strong>" + e.entries[i].dataPoint.y + "</strong><br/>";
			}
			return content;
		},
	  },
	  axisX:{
		  labelFormatter : function(e) {
			  return e.value + 1;
		  }
	  },
	  axisY:{
		  includeZero: false,
	  },
	  rangeChanged: function(e){
		 var indexOfLowestElement = Math.floor(e.axisX.viewportMinimum);
		 e.chart.options.axisY.minimum=e.chart.options.data[0].dataPoints[indexOfLowestElement].y;
		 e.chart.render();
	  },
      data: [],
    }));
	$$(".simulation-cfd-tab").bind('isVisible', function() {
		updateCFDConfiguration.bind(this)();
		updateCFD(this.simulation.time, this.simulation.stats);
	}.bind(this));
	var colors = ['silver', 'mediumaquamarine', 'lightskyblue', 'lightpink', 'lightgray', 'lightcoral', 'lightblue', 'burlywood', 'antiquewhite'];
	function updateCFDConfiguration() {
		var groups = [];
		var group = [];
		var checkboxes = $$(".simulation-cfd-settings input[type='checkbox']");
		for (var i=0; i<checkboxes.length; i++) {
			var checkbox = checkboxes[i];
			var checked = checkbox.checked;
			if (checked) {
				group = [];
				groups.push(group);
			}
			group.push([checkbox.parentElement, this.simulation.board.columns[i]]);
		}
		for (var i=0; i<groups.length; i++) {
			for (var j =0; j<groups[i].length; j++) {
				$(groups[i][j][0]).css("backgroundColor", colors[i]);
			}
		}
		var model = [];
		for (var i=0; i<groups.length; i++) {
			var columnsToSum = [];
			var name = "group " + i;
			var fromActiveColumn = false;
			var fromColumn = false;
			var fromCoumnsActive = [];
			for (var j =0; j<groups[i].length; j++) {
				var column = groups[i][j][1];
				columnsToSum.push(column);
				if (!fromColumn) {
					name = column.label;
					fromColumn = true;
				}
				if (!fromActiveColumn && !column.isQueue() && fromCoumnsActive.length == 0) {
					name = column.label;
					fromActiveColumn = true;
				}
				if (!column.isQueue()) {
					fromCoumnsActive.push(column);
				}
				if (fromCoumnsActive.length > 1) {
					name = "";
					for (var k=0; k<fromCoumnsActive.length; k++) {
						name += fromCoumnsActive[k].shortLabel + " ";
					}
				}
			}
			model[groups.length - 1 - i] = { type: "stackedArea", dataPoints: [], name: name.trim(), showInLegend: true, color: colors[i], columnsToSum: columnsToSum};
		}
		$$(".simulation-cfd").CanvasJSChart().options.data = model;
		lastUpdatedCFDDay = -1;
		updateCFD(this.simulation.time, this.simulation.stats);
	};
	$$(".simulation-cfd-settings input[type='checkbox']").change(updateCFDConfiguration.bind(this));
	$$(".simulation-cfd-settings div:not(:first-child)").click(function(event) {
		var checkbox = $(event.target).find("input[type='checkbox']")[0];
		if (!checkbox) return;
		checkbox.checked = !checkbox.checked;
		updateCFDConfiguration.bind(this)();
	}.bind(this));
	
	$$(".simulation-littles-tab").CanvasJSChart($.extend(true, {}, commonDiagramProperties, {
	  axisX:{
		  labelFormatter : function(e) {
			  return "D:" + (Math.floor(e.value / 8) + 1) + " h:" + Math.floor(e.value % 8 + 9);
		  }
	  },
	  axisY2:{
		  maximum: 100
	  },
	  toolTip: {
  		contentFormatter: function (e) {
  			var content = "Day: <strong>" + Math.floor(e.entries[0].dataPoint.x / 8 + 1) + "</strong>, hour: <strong>" + (e.entries[0].dataPoint.x % 8 + 9) + "</strong><br/>";
  			for (var i = 0; i< e.entries.length; i++) {
				if (!isNaN(e.entries[i].dataPoint.y))
					content += e.entries[i].dataSeries.name + ": <strong>" + e.entries[i].dataPoint.y.toFixed(1) + "</strong><br/>";
  			}
  			return content;
  		},
	  },
      data: [{        
          type: "line",
		  name: "WIP",
		  dataPoints: [],
		  showInLegend: true,
      },{        
          type: "line",
    	  name: "Throughput",
          dataPoints: [],
		  showInLegend: true,
      },{        
          type: "line",
		  name: "Lead Time",
          dataPoints: [],
		  showInLegend: true,
      },{        
          type: "line",
		  name: "Capacity Utilisation",
          dataPoints: [],
		  showInLegend: true,
		  axisYType: "secondary",
      },
      ]
    }));
	$$(".simulation-littles-tab").bind('isVisible', function() {
		updateLittles(this.simulation.time, this.simulation.stats)
	}.bind(this));
	
	$$(".simulation-cod-tab").CanvasJSChart($.extend(true, {}, commonDiagramProperties, {
	  axisX:{
		  labelFormatter : function(e) {
			  if (e.value % 8 == 0) return e.value / 8 + 1;
			  return ""
		  }
	  },
	  toolTip: {
  		contentFormatter: function (e) {
  			var content = "Day: <strong>" + Math.floor(e.entries[0].dataPoint.x / 8 + 1) + "</strong><br/>";
  			for (var i = 0; i< e.entries.length; i++) {
				if (!isNaN(e.entries[i].dataPoint.y))
					content += e.entries[i].dataSeries.name + ": <strong>" + e.entries[i].dataPoint.y.toFixed(1) + "</strong><br/>";
  			}
  			return content;
  		},
	  },
      data: [{        
          type: "line",
		  name: "Cost Of Delay/d",
          dataPoints: [],
		  showInLegend: true,
      },{  
          type: "line",
		  name: "Value Delivered/d",
          dataPoints: [],
		  showInLegend: true,
      },{
          type: "line",
		  name: "Value Dropped/d",
          dataPoints: [],
		  showInLegend: true,
      },{      
          type: "line",
		  name: "WIP",
		  dataPoints: [],
		  showInLegend: true,
		  axisYType: "secondary",
      }
      ]
    }));
	$$(".simulation-cod-tab").bind('isVisible', function() {
		updateCod(this.simulation.time, this.simulation.stats);
	}.bind(this));
	
	$$(".simulation-scatterplot-tab").CanvasJSChart($.extend(true, {}, commonDiagramProperties, {
	  axisX:{
		  labelFormatter : function(e) {
			  return "D:" + (Math.floor(e.value / 60 / 8) + 1) + " h:" + Math.floor(e.value / 60 % 8 + 9);
		  }
	  },
	  toolTip: {
  		contentFormatter: function (e) {
			var value = e.entries[0].dataPoint.x;
  			var content = "Day: <strong>" + (Math.floor(value / 60 / 8) + 1) + ", hour:" + Math.floor(value / 60 % 8 + 9) + "</strong><br/>";
  			for (var i = 0; i< e.entries.length; i++) {
				if (!isNaN(e.entries[i].dataPoint.y))
					content += e.entries[i].dataSeries.name + ": <strong>" + e.entries[i].dataPoint.y.toFixed(1) + "</strong><br/>";
  			}
  			return content;
  		},
	  },
      data: [{        
          type: "scatter",
		  name: "Lead Time",
          dataPoints: [],
		  showInLegend: false,
		  markerSize: 4,
      },{        
          type: "line",
		  name: "Percentile",
		  dataPoints: [],
		  showInLegend: false,
		  axisYType: "secondary",
      }
      ]
    }));
	$$(".simulation-scatterplot-tab").bind('isVisible', function() {
		updateScatterPlot(this.simulation.time, this.simulation.stats)
	}.bind(this));
	
	$$(".bottom-menu>div:not(:nth-of-type(1))").hide();
	
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
	
	$$(".board th.column-settings-header").mouseover(function() {
		$$('.column-settings').show();
	});
	$$(".board th.column-settings-header").mouseleave(function() {
		$$('.column-settings').hide();
	});
	
	this.update = function(board, stats, force) {
		var now = Date.now();
		if (!force && now - this.lastUpdated < 1000/this.fps) return;
		this.lastUpdated = now;
		updateTime(this.simulation.time, this.cache);
		updateStats(stats, this.cache);
		updateBoard(board, this.renderTasks);
		updateCFD(this.simulation.time, stats);
		updateLittles(this.simulation.time, stats);
		updateCod(this.simulation.time, stats, force);
		updateScatterPlot(this.simulation.time, stats, force);
	}

	function updateTime(time, cache) {
		function pad(n) {
		    return (n < 10) ? ("0" + n) : n;
		}
		$$(".day").text(pad(Math.floor(time / (8 * 60)) + 1));
		$$(".hour").text(pad(Math.floor(time/60) % 8  + 9) + ":" + pad(time % 60));
	}
	
	function updateStats(stats, cache) {
		var wipAvg = stats.wip.getAvg();
		var leadTimeAvg = stats.leadTime.getAvg();
		$$('.stats-wip').text(wipAvg ? wipAvg.toFixed(1) : '-');
		$$('.stats-throughput').text(stats.throughput.getAvg() ? stats.throughput.getAvg().toFixed(1) : '-');
		$$('.stats-lead-time').text(leadTimeAvg ? leadTimeAvg.toFixed(1) : '-');
		$$('.stats-wip-lead-time').text(wipAvg && leadTimeAvg ? (wipAvg / leadTimeAvg).toFixed(1) : '-');
		$$('.stats-utilisation').text(stats.capacityUtilisation.getAvg() ? stats.capacityUtilisation.getAvg().toFixed(1) : '-');
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
		var model = $$(".simulation-cfd").CanvasJSChart().options.data;
		for (var i=0; i<model.length; i++) {
			var columnsToSum = model[i].columnsToSum;
			for (var j=model[i].dataPoints.length; j<stats.cfdData[columnsToSum[0].name].length; j++) {
				var sum = 0;
				for (var k=0; k<columnsToSum.length; k++) {
					sum += stats.cfdData[columnsToSum[k].name][j].y;
				}
				model[i].dataPoints[j] = {x: stats.cfdData[columnsToSum[0].name].x, y: sum};
			}
		}
		$$(".simulation-cfd").CanvasJSChart().render();
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
		diagramData[0].dataPoints = stats.wip.getAvgHistory();
		diagramData[1].dataPoints = stats.throughput.getAvgHistory();
		diagramData[2].dataPoints = stats.leadTime.getAvgHistory();;
		diagramData[3].dataPoints = stats.capacityUtilisation.getAvgHistory();
		tab.CanvasJSChart().render();
	}
	
	var lastUpdatedCodDay = 0;
	function updateCod(time, stats, recalculate) {
		var tab = $$(".simulation-cod-tab" + (recalculate ? "" : ":visible"), false);
		if (tab.length == 0) {
			return;
		}
		var currentDay = Math.floor(time / (60 * 8));
		if (currentDay <= lastUpdatedCodDay) {
			tab.CanvasJSChart().render();
			return;
		}
		lastUpdatedCodDay = currentDay;
		var diagramData = tab.CanvasJSChart().options.data;
		diagramData[0].dataPoints = stats.costOfDelay.getAvgHistory();
		diagramData[1].dataPoints = stats.valueDelivered.getAvgHistory();
		diagramData[2].dataPoints = stats.valueDropped.getAvgHistory();
		if (recalculate) diagramData[3].dataPoints = [];
		var wipHistory = stats.wip.getAvgHistory();
		for (var i=diagramData[3].dataPoints.length * 8; i<wipHistory.length; i+=8) {
			diagramData[3].dataPoints.push(wipHistory[i]);
		}
		tab.CanvasJSChart().render();
	}
	
	var lastUpdatedScatterPlotDay = 0;
	function updateScatterPlot(time, stats, recalculate) {
		var tab = $$(".simulation-scatterplot-tab:visible", false);
		if (tab.length == 0) {
			return;
		}
		var currentDay = Math.floor(time / (60 * 8));
		if (currentDay <= lastUpdatedScatterPlotDay) return;
		lastUpdatedScatterPlotDay = currentDay;
		var diagramData = tab.CanvasJSChart().options.data;
		diagramData[0].dataPoints = stats.leadTimesHistory;
		if (recalculate) diagramData[1].dataPoints = [];
		// for (var i=diagramData[1].dataPoints.length * 8; i<stats.wipAvgHistory.length; i+=8) {
// 			diagramData[1].dataPoints.push(stats.wipAvgHistory[i]);
// 		}
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