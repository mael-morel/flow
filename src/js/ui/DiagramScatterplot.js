function DiagramScatterplot(simulation) {
    this.simulation = simulation;

    $$(".simulation-scatterplot-tab").CanvasJSChart($.extend(true, {}, commonDiagramProperties, {
        axisX: {
            labelFormatter: function (e) {
                return "D:" + (Math.floor(e.value / 60 / 8) + 1) + " h:" + Math.floor(e.value / 60 % 8 + 9);
            }
        },
        toolTip: {
            contentFormatter: function (e) {
                var value = e.entries[0].dataPoint.x;
                var content = "Day: <strong>" + (Math.floor(value / 60 / 8) + 1) + ", hour:" + Math.floor(value / 60 % 8 + 9) + "</strong><br/>";
                for (var i = 0; i < e.entries.length; i++) {
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
        }, {
            type: "line",
            name: "Percentile",
            dataPoints: [],
            showInLegend: false,
            axisYType: "secondary",
        }
        ]
    }));

    this.lastUpdatedDay = 0;
    this.update = function (recalculate) {
        var time = this.simulation.time;
        var stats = this.simulation.stats;
        var tab = $$(".simulation-scatterplot-tab:visible", false);
        if (tab.length == 0) {
            return;
        }
        var currentDay = Math.floor(time / (60 * 8));
        if (currentDay <= this.lastUpdatedDay) return;
        this.lastUpdatedDay = currentDay;
        var diagramData = tab.CanvasJSChart().options.data;
        diagramData[0].dataPoints = stats.leadTimesHistory;
        if (recalculate) diagramData[1].dataPoints = [];
        // for (var i=diagramData[1].dataPoints.length * 8; i<stats.wipAvgHistory.length; i+=8) {
// 			diagramData[1].dataPoints.push(stats.wipAvgHistory[i]);
// 		}
        tab.CanvasJSChart().render();
    }

    this.redraw = function () {
        this.lastUpdatedDay = -1;
        this.update();
    }

    $$(".simulation-scatterplot-tab").bind('isVisible', this.update.bind(this));
}