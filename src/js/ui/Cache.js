var cache = new Cache();
var hookSelector = "";
function $$(selector, useCache) {
    if (useCache == undefined || useCache) {
        return cache.get(hookSelector + " " + selector);
    }
    return $(hookSelector + " " + selector);
}

function Cache() {
    this.cache = {};
    this.get = function (query) {
        var value = this.cache[query];
        if (value) return value;
        var jquery = $(query);
        this.cache[query] = jquery;
        return jquery;
    }

    this.put = function (query, value) {
        this.cache[query] = value;
    }
}