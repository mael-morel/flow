$(document).ready(function() {
	var urlParam = function(name){
		var results = new RegExp('[#]' + name + '=([^&#]*)').exec(window.location.href);
		return results ? results[1] || null : null;
	}
	var config = {};
	var configEncoded = urlParam("simulation-config");
	if (configEncoded != null && configEncoded.length > 0) {
		config = JSON.parse(atob(configEncoded));
	}
	new Simulation(".kanban-board", config);
});

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