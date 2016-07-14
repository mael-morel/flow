function DiagramCOD (simulation) {
	this.simulation = simulation;
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

	this.lastUpdatedDay = 0;
	this.update = function(recalculate) {
		var time = this.simulation.time;
		var stats =  this.simulation.stats;
		var tab = $$(".simulation-cod-tab" + (recalculate ? "" : ":visible"), false);
		if (tab.length == 0) {
			return;
		}
		var currentDay = Math.floor(time / (60 * 8));
		if (currentDay <= this.lastUpdatedDay) {
			tab.CanvasJSChart().render();
			return;
		}
		this.lastUpdatedDay = currentDay;
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
	this.redraw = function(force) {
		this.lastUpdatedDay = -1;
		this.update(force);
	}
	
	$$(".simulation-cod-tab").bind('isVisible', this.update.bind(this));
	
}