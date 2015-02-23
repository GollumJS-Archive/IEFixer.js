var IEFixer = {
	
	index: 0,
	cssAjaxContentFiles: {},
	sheets: {},
	
	init: function () {
		var _this = this;
		
		this.rulesManager = new IEFixer.NewRulesManager ();
		
		setInterval (function() {
			_this.watch();
		}, 1000);
		$(window).load(function () {
			$(window).resize(function() {
				_this.watch();
			}, 1000);
		});
		this.watch();
	},
	
	watch: function ()  {
		
		var _this = this;
		var list  = jQuery('link[type="text/css"]');
		
		list.each(function (i) {
			
			var el = jQuery(list[i]);
			
			if (!el.hasClass("IEFixer_target")) {
				
				var id = el.attr("IEFixer_id");
				
				if (id === undefined) {
					id = _this.index++;
				}
				if (_this.sheets[id] === undefined) {
					_this.parseCSS(id, el, function () {
						_this.sheets[id].watch ();
					});
				}
			}
		});
		
		for (var i in this.sheets) {
			this.sheets[i].watch ();
		}
		
	},
	
	parseCSS: function (id, css, callback) {
		
		var _this = this;
		var href = css.attr("href");
			
		css.attr("IEFixer_id", id);
		
		if (href) {
			(function (id, css) {
				if (_this.cssAjaxContentFiles[id] !== undefined) {
					_this.parseForWatch (id, css, _this.cssAjaxContentFiles[id]);
					callback ();
					return;
				}
				
				jQuery.ajax (href, {
					method: "get",
					async: true,
					xhrFields: (_this.isCrossDomain (href) ?  {withCredentials: true} : undefined),
					success: function (content) {
						_this.cssAjaxContentFiles[id] = content;
						_this.parseForWatch (id, css, content);
						callback ();
					},
					error: function () {
						_this.cssAjaxContentFiles[id] = "";
						_this.parseForWatch (id, css, "");
						callback ();
					}
				})
			})(id, css);
		} else {
			this.parseForWatch (id, css, css.html());
			callback ();
		}
		
	},
	
	isCrossDomain: function (dest) {
		var a = document.createElement('a'); a.href = dest;
		return window.location.protocol != a.protocol || window.location.hostname != a.hostname;
	},
	
	parseForWatch: function (id, css, content) {
		this.sheets[id] = new IEFixer.SheetWatcher(this, id, css, content);
	}
};

/**
 * Css container Watcher
 */
IEFixer.SheetWatcher = function(ieFixer, id, css, content) {
	
	this.ieFixer = ieFixer;
	this.id      = id;
	this.origin  = css; 
	var parser   = new CSSParser();
	this.raw     = parser.parse(content, false, false);
	this.target  = $('<style IEFixer_target="'+id+'" class="IEFixer_target" ></style>').appendTo('head');
	
	if (this.raw) {
		this.searchPolifyBlock ();
	}
	return this;
};

(function () { var p = {
		
	ieFixer: null,
	id     : null,
	raw    : null,
	origin : null,
	target : null,
	
	blocksRulesWatched: null,
	
	searchPolifyBlock: function () {
		
		this.blocksRulesWatched = [];
		
		for (var i = 0; i < this.raw.cssRules.length; i++) {
			
			var rule = this.raw.cssRules[i];
			
			if (rule.type == 4) { // Type media
				this.blocksRulesWatched.push(new IEFixer.BlocksRulesWatchedMedia (rule));
			} else if (rule.type == 1 && this.ieFixer.rulesManager.hasFixedRule (rule.selectorText())) {
				this.blocksRulesWatched.push(new IEFixer.BlocksRulesWatchedNormal (rule));
			}
			
		}
	},
	
	watch: function() {
		
		if (!this.raw) {
			return;
		}
		
		if (!jQuery.contains(document, this.origin[0])) {
			this.destroy();
		}
		
		var oldContent = this.target.html();
		var newContent = "";
		
		for (var i = 0; i < this.blocksRulesWatched.length; i++) {
			var rWatched = this.blocksRulesWatched[i];
			
			if (rWatched.mustApply ()) {
				newContent += rWatched.serialize ();
			}
		}
		
		if (oldContent != newContent) {
			var style = this.target [0];
			if (style.styleSheet) {
				style.styleSheet.cssText = newContent;
			} else {
				this.target.html(newContent);
			}
		}
		
	},
	
	destroy: function() {
		this.target.detach();
		this.target.remove();
		delete this.ieFixer.sheets[this.id];
		delete this;screen 
	}
	
}; IEFixer.SheetWatcher.prototype = p; }) ();


/**
 * Content list of css rule normarly
 */
IEFixer.BlocksRulesWatchedNormal = function (rule) {
	this.rules = [];
	this.addRule(rule);
};
(function () { var p = {
	
	type: "normal",
	
	rules: null,
	
	mustApply: function () {
		return true;
	},
	
	addRule: function (rule) {
		this.rules.push(rule);
	},
	
	serialize: function () {
		var out = "";
		
		for (var i = 0; i < this.rules.length; i++) {
			
			var selector = this.rules[i].selectorText();
			
			// TODO
			var key = ':first-child';
			if (selector.indexOf(key) != -1) {
				var explode = selector.split (key);
				var className = 'iefixer-'+key.substr(1);
				var t = $(explode[0]+key);
				t.addClass(className);
				selector = explode[0]+'.'+className+explode[1];
			}
			
			key = ':last-child';
			if (selector.indexOf(key) != -1) {
				var explode = selector.split (key);
				var className = 'iefixer-'+key.substr(1);
				var t = $(explode[0]+key);
				t.addClass(className);
				selector = explode[0]+'.'+className+explode[1];
			}
			
			key = ':nth-child';
			if (selector.indexOf(key) != -1) {
				var explode = selector.split (key);
				var value = explode[1].substr(0, explode[1].indexOf(")")+1);
				explode[1] = explode[1].substr(value.length);
				
				value = $.trim(value);
				var classSuffix = value.replace (/[()+-]/gi, "_");
				var className = 'iefixer-'+key.substr(1)+classSuffix;
				var t = $(explode[0]+key+value);
				t.addClass(className);
				selector = explode[0]+'.'+className+explode[1];
			}
			
			this.rules[i].mSelectorText = selector;
			
			out += this.rules[i].cssText()+"\n";
		}
		
		return out;
	}
	
}; IEFixer.BlocksRulesWatchedNormal.prototype = p; }) ();


/**
 * Content in media query rule
 */
IEFixer.BlocksRulesWatchedMedia = function (globalRule) {
	this.rules      = [];
	this.expression = globalRule.media;
	for (var i = 0; i < globalRule.cssRules.length; i++) {
		this.addRule(globalRule.cssRules[i]);
	}
	
};
(function () { var p = {
	
	type: "media",
	expression: "",
	
	mustApply: function () {
		for (var i =0; i < this.expression.length; i++) {
			if (matchMedia(this.expression[i]).matches) {
				return true;
			}
		}
		return false;
	},
	
}; IEFixer.BlocksRulesWatchedMedia.prototype = {}; jQuery.extend(IEFixer.BlocksRulesWatchedMedia.prototype, IEFixer.BlocksRulesWatchedNormal.prototype, p); }) ();

IEFixer.NewRulesManager = function () {
	
};
(function () { var p = {
	
	hasFixedRule: function (selector) {
		
		
		var rtn = 
			selector.indexOf(":first-child") != -1 ||
			selector.indexOf(":last-child") != -1 ||
			selector.indexOf(":nth-child") != -1
		;
		
		return rtn;
		
	}
	
}; IEFixer.NewRulesManager.prototype = p; }) ();

/**
 * Initialisation
 */
$(window).load (function () {
	IEFixer.init();
});
