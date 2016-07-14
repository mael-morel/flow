function DiagramLittles(simulation) {
	this.simulation = simulation;
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

	this.lastUpdatedDay = 0;
	this.update = function() {
		var time = this.simulation.time;
		var stats =  this.simulation.stats;
		var tab = $$(".simulation-littles-tab:visible", false);
		if (tab.length == 0) {
			return;
		}
		var currentDay = Math.floor(time / (60 * 8));
		if (currentDay <= this.lastUpdatedDay) return;
		this.lastUpdatedDay = currentDay;
		var diagramData = tab.CanvasJSChart().options.data;
		diagramData[0].dataPoints = stats.wip.getAvgHistory();
		diagramData[1].dataPoints = stats.throughput.getAvgHistory();
		diagramData[2].dataPoints = stats.leadTime.getAvgHistory();;
		diagramData[3].dataPoints = stats.capacityUtilisation.getAvgHistory();
		tab.CanvasJSChart().render();
	}
	
	this.redraw = function() {
		this.lastUpdatedDay = -1;
		this.update();
	}
	
	$$(".simulation-littles-tab").bind('isVisible', this.update.bind(this));
}
