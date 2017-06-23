/// GLOBALS \\\
noop = function () {};

callback = function (a) {
	if (typeof a === "function") return a();
};

value = function (a) {
	return function () {
		return a;
	};
};

assert = function (condition, message) {
	if (!condition) {
		throw message || "Assertion failed";
	}
};

window.requestAnimationFrame = (function () {
	return (window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			function (callback) {
				window.setTimeout(callback, 1000 / 60);
			});
})();

if ("undefined" == typeof (Nithya)) {

	Nithya = (function () {
		/**
		* For a page, this tracks which script files have been loaded.
		* Currently, this will only include scripts loaded through injectResource.
		* The key value will be the script source file path. The value will be
		* true once successfully loaded
		*/
		var scriptsLoaded = [];
		var documentStateLoaded = false;
		var debugMode = false; //should default as false for production, initial state should be .NET system setting (set by ASP)

		function locateFunction(callback) {
			if ("undefined" == typeof (window[callback])) { //anonymous function was defined
				return callback;
			} else {
				return window[callback];
			}
		}

		function whenScriptsReady(callback, dependencies) {
			dependencies = dependencies || scriptsLoaded;
			for (var src in dependencies) {
				if (scriptsLoaded[src] == "loading") {
					window.setTimeout(function () {
						whenScriptsReady(callback, dependencies);
					}, 100);
					return false;
				}
			}
			(locateFunction(callback))(); //found through Nithyasure scope
			return true;
		}

		function checkDependencyScripts(dependencies, callback){
			whenScriptsReady(callback, dependencies);
		}

		window.addScriptLoadEvent = function (src, f) {
			scriptsLoaded[src] = true;
			if (f) {
				if (!documentStateLoaded) { //if document hasn't loaded, wait for to finish
					addEvent(window, "load", f);
				} else {
					(locateFunction(f))(); //found through Nithyasure scope
				}
			}
		};

		/**
		* If there is javascript that needs to execute on EVERY page load (session
		* resets, interaction enabling, etc), you can make the calls to the
		* code here. Try not to include a lot of inline script.
		*/

		function fnOnload() {
			//injectResource("Nithya.tools.js");
			documentStateLoaded = true; //preserved by Nithyasure
			if (window.bootstrapApp && "function" == typeof (bootstrapApp)){
				whenScriptsReady(bootstrapApp);
				Nithya.load(CDN.media + "XXXXXX.js", function(){
					Nithya.loadIndicator.start();
				});
				Nithya.load(CDN.media + "XXXXXX/js/Nithya.hisrc.js", function(){
					Nithya.hisrc.runSpeedTest(CDN.media + "player/img/speedTest.jpg");
				});
			}
			//$.ajax.data = {"bootstrapped":true};
		}

		function addEvent(obj, type, fn) {
			if (obj.attachEvent) {
				obj["e" + type + fn] = fn;
				obj[type + fn] = function () {
					obj["e" + type + fn](window.event);
				};
				obj.attachEvent("on" + type, obj[type + fn]);
			} else {
				obj.addEventListener(type, fn, false);
			}
		}

		function removeEvent(obj, type, fn) {
			if (obj.detachEvent) {
				obj.detachEvent("on" + type, obj[type + fn]);
				obj[type + fn] = null;
			} else {
				obj.removeEventListener(type, fn, false);
			}
		}


		/**
		 * Injects a Javascript/CSS file into the page.
		 */
		function injectResource(src, callback, attrs) {
			if (document.createElement && document.childNodes) {
				if(src.lastIndexOf(".")<0){
					src = _moduleLoader(src);
				}
				if (!scriptsLoaded[src]) {
					attrs = attrs || {}; //prevents undefined exceptions
					//even if this doesn't load, then other uses of this library won't load either
					scriptsLoaded[src] = "loading"; //so note we'"'re trying to lazy load it
					var scriptElem = null;
					if (src.lastIndexOf(".css") > 0) { //inject css
						scriptElem = document.createElement("link");
						scriptElem.setAttribute("rel", (attrs.rel || "stylesheet"));
						scriptElem.setAttribute("type", "text/css");
						if (attrs.media) {
							scriptElem.setAttribute("media", attrs.media);
						}
						scriptElem.setAttribute("href", src);
					} else { //inject javascript
						scriptElem = document.createElement("script");
						scriptElem.setAttribute("type", "text/javascript");
						scriptElem.setAttribute("src", src);
					}

					if(scriptElem.readyState){ // IE, incl. IE9
						scriptElem.onreadystatechange = function () {
							if (scriptElem.readyState == "loaded" || scriptElem.readyState == "complete") {
								scriptElem.onreadystatechange = null;
								window.addScriptLoadEvent(src, callback);
							}
						};
					}else {
						scriptElem.onload = function () {
							window.addScriptLoadEvent(src, callback);
						};
					}
					document.getElementsByTagName("head")[0].appendChild(scriptElem);
/*
//This does fix webkit for windows...but safari is SO old that it doesn't support most HTML5 elements, so, lets just leave the page white
					if (src.lastIndexOf(".css") > 0) { //webkit doesn't support onload event for CSS files
						var img = document.createElement('img');
						img.onerror = function(){
							window.addScriptLoadEvent(src, callback);
						};
						img.src = src;
					}
*/
				} else { //script library has been requested/pulled in, so directly call functions for execution
					if (callback && scriptsLoaded[src] == "loading") { //library is still loading
						//script is currently being loaded, so set timeout here
						whenScriptsReady(callback);
					} else {
						//attach first callback for loaded script
						//this won't work if two jsInserts for same library called in succession (for FF)
						window.addScriptLoadEvent(src, callback);
					}
				}
			} else {
				alert("Your browser is not W3C DOM compliant.");
			}
		}

		function enableDebug(state) {
			debugMode = ("undefined"!==typeof(state))? state : true;
		}

		function isDebug(){
			return debugMode;
		}

		var canUseTopFrame = (function(){
			try {
				return window.self !== window.top;
			} catch (e) {
				return true;
			}
		})();

		/**
		 * Debug to console, only if in debugMode=true (or an error)
		 */
		function bark(msg, level) {
			level = level || "log";
			var console = (!canUseTopFrame && window.top.console) || window.console || undefined;
			if (debugMode || "error" === level) {
				if ("object" == typeof (console) && console[level]) {
					console[level](msg); //console[level](msg);
				}
			}
		}

		function findInQueryString(key) {
			key = key.replace(/[*+?^$.\[\]{}()|\\\/]/g, "\\$&"); // escape RegEx meta chars
			var match = location.search.match(new RegExp("[?&]"+key+"=([^&]+)(&|$)"));
			return match && decodeURIComponent(match[1].replace(/\+/g, " "));
		}

		window.addScriptLoadEvent(null, fnOnload);

		return {
			isDebug: isDebug,
			enableDebug: enableDebug,
			bark: bark,
			load: injectResource,
			callback: locateFunction,
			afterLoad: whenScriptsReady,
			depending: checkDependencyScripts,
			qs: findInQueryString
		};
	})();
}
