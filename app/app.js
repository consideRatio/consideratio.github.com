/****************************************************
* Application
****************************************************/
window.App = Ember.Application.create({
  LOG_TRANSITIONS: true
});

window.toggle = 1;

App.listsListController = null;

/****************************************************
* Handlebars Helper
****************************************************/

/****************************************************
* Utils
****************************************************/
App.Utils = Ember.Object.extend({});
App.Utils.reopenClass({
  beep: function() {
    $("#beep").get(0).play();
  },

  // Pass a number or an array to shuffle
  shuffle: function(arg) {
    var array, i, j, tempi, tempj;
    if (typeof arg === "number") {
      array = new Array(arg); i = arg;
    }
    else {
      array = arg, i = arg.length;
    }

    var array = new Array(arg), i = arg, j, tempi, tempj;
    for (var k = 0; k < array.length; k++) { array[k] = k; }
    while ( --i ) {
       j = Math.floor( Math.random() * ( i + 1 ) );
       tempi = array[i]; tempj = array[j];
       array[i] = tempj; array[j] = tempi;
    }
    return array;
  }
});

App.Timer = Ember.Object.extend({
  // Settings
  context: null,

  // State
  running: false,
  paused: false,
  ticks: 0,
  _intervalId: 0,

  state: function() {
    return (this.running ? "Running" : (this.paused ? "Paused" : "Stopped"));
  }.property('running', 'paused'),

  start: function(interval) {
    if (this.running)
      return;
    this.set('running', true);
    this.set('paused', false);
    var _timer = this;
    this._intervalId = setInterval(function() {
      _timer.incrementProperty('ticks');
      _timer.tick.apply(_timer.context);
    }, interval);
  },
  tick: function() {
    console.log("default-tick");
  },
  stop: function() {
    clearInterval(this._intervalId);
    this.set('running', false)
  },
  clean: function() {
    this.stop();
    this.set('paused', false);
    this.set('ticks', 0);
  }
});

/****************************************************
* Router
****************************************************/
App.Router.map(function() {
  this.resource('lists', function() {
    this.route('list', { path: '/:list_id' });
  });
});

// '/lists' --- LISTS --- Dummy
App.ListsRoute = Ember.Route.extend({
  renderTemplate: function() {
    this.render('lists', { into: 'application' });
  }
});

// '/lists' --- LISTS/INDEX --- All lists
App.ListsIndexRoute = Ember.Route.extend({
  model: function() {
    return App.List.find();
  },
  renderTemplate: function() {
    this.render('lists/index', { into: 'application' });
  }
});

// '/lists/:list_id' --- LISTS/LIST --- One list
App.ListsListRoute = Ember.Route.extend({
  model: function(params) {
    return App.List.find(params.list_id);
  },
  renderTemplate: function() {
    this.render('lists/list', { into: 'application' });
  },
  setupController: function(controller, model) {
    if (!controller.timer)
      controller.timer = App.Timer.create();
    controller.clean();
    App.set('listsListController', controller);
  }
});

/****************************************************
* Controller
****************************************************/
App.ListsIndexController = Ember.ArrayController.extend({
  hasData: function(key, value) { return App.List.find().get('length') > 0; }.property('@each')
});

App.ListsListController = Ember.ObjectController.extend({
  repeat: false,
  shuffle: false,
  beep: false,
  shuffleArray: null,

  show1: true,
  show2: true,

  freshShuffle: false,
  
  timer: null,
  currentItemIndex: 0,
  currentItemNumber: function() {
    return this.currentItemIndex+1;
  }.property('currentItemIndex'),

  interval: 500,

  currentItem: function() {
    return this.shuffle ? this.getItem(this.shuffleArray[this.currentItemIndex]) : this.getItem(this.currentItemIndex)
  }.property('content', 'currentItemIndex', 'shuffleArray', 'shuffle'),
  length: function(index) {
    return this.content.get('items').get('length');
  }.property('content'),

  // Actions
  /***************************************************/
  startPause: function() {
    if (this.timer.running) { // Pause
      this.timer.set('paused', true);
      this.timer.stop();
    }
    else { // Start
      if (this.timer.paused)
        this.timer.set('paused', false);
      else
        this.set('currentItemIndex', 0);
      this.timer.context = this; this.timer.tick = this.tick; this.timer.start(this.interval);
    }
  },
  stop: function() {
    if (this.timer.paused)
      this.timer.set('paused', false);
    else
      this.reshuffle();

    this.set('currentItemIndex', 0)
    this.timer.stop();
  },
  tick: function() {
    // Make sound?
    if (this.beep)
      App.Utils.beep();

    // If looping over from 99->0 using repeat
    if (this.currentItemIndex + 1 === this.get('length')) {
      this.reshuffle();
      this.set('currentItemIndex', 0);
    }
    else // If a normal tick
    {
      this.incrementProperty('currentItemIndex');
      this.set('freshShuffle', false);
    }

    if (!this.repeat && (this.currentItemIndex + 1 === this.get('length')))
      this.timer.stop();
  },

  isDuo: function() {
      return this.show1 && this.show2 && this.get('currentItem').get('text') && this.get('currentItem').get('imgText');
  }.property('currentItem.text', 'currentItem.imgText', 'show1', 'show2'),

  soloItem: function() {
    if (this.get('currentItem')?false:true)
      return "fail";
    if (this.get('currentItem').get('isSolo'))
      return this.get('currentItem').get('soloItem');
    return show1 ? this.get('currentItem').get('text') : this.get('currentItem').get('imgText');
  }.property('currentItem.text', 'currentItem.imgText', 'show1', 'show2'),

  // Helpers
  /***************************************************/
  toggleMeny: function() {
    toggle = (App.listsListController.timer.running ? 0.2 : 1);
    $(".row-fluid:not(.important)").fadeTo("slow", toggle);
    $(".not-important").fadeTo("slow", toggle);
  }.observes('App.listsListController.timer.running'),

  reshuffle: function() {
    if (this.get('freshShuffle'))
      return;
    this.set('shuffleArray', App.Utils.shuffle(this.get('length')));
    this.set('freshShuffle', true);
  },
  clean: function() {
    this.timer.clean();
    this.reshuffle();
    this.set('currentItemIndex', 0);
  },
  getItem: function(index) {
    return this.content.get('items').objectAt(index);
  }
});

/****************************************************
* View
****************************************************/

App.TextField = Ember.TextField.extend({
  attributeBindings: ['style'],

  style: function() {
    return "width: 50px; margin-bottom: 2px;";
  }.property('App.listsListController.timer.running')
});

App.Checkbox = Ember.Checkbox.extend({
  attributeBindings: ['style'],

  style: function() {
    return "margin-top: -2px; margin-left: 0px; margin-right: 3px; margin-bottom: 0px;";
  }.property()
});

/****************************************************
* Model
****************************************************/

/* Defenitions *************************************/
App.Store = DS.Store.extend({
  revision: 12,
  adapter: 'DS.FixtureAdapter'
});

App.List = DS.Model.extend({
  name: DS.attr('string'),
  desc: DS.attr('string'),
  items: DS.hasMany('App.ListItem')
});

App.ListItem = DS.Model.extend({
  list: DS.belongsTo('App.List'),
  text: DS.attr('string'),
  imgText: DS.attr('string'),

  isDuo: function() {
    return this.get('text')?true:false && this.get('imgText')?true:false;
  }.property('text', 'imgText'),
  isSolo: function() {
    return !this.get('isDuo');
  }.property('isDuo'),
  soloItem: function() {
    return this.get('text')?true:false ? this.get('text') : this.get('imgText');
  }.property('isDuo')
});

/* Fixtures ****************************************/
App.List.FIXTURES = [{
  id: 1,
  name: "Lektion 1 - Uppgift 1",
  desc: "Använd kedjemetoden",
  items: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]
}, {
  id: 2,
  name: "Lektion 1 - Uppgift 2",
  desc: "Använd kedjemetoden",
  items: [26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50]
}, {
  id: 3,
  name: "Figurkoder 01",
  desc: "Använd kedjemetoden",
  items: [101,102,103,104,105,106,107,108,109,110]
}];

App.ListItem.FIXTURES = [
  { id: 1, list: 1, text: "", imgText: "telefon" },
  { id: 2, list: 1, text: "", imgText: "bokhylla" },
  { id: 3, list: 1, text: "", imgText: "bok" },
  { id: 4, list: 1, text: "", imgText: "tv" },
  { id: 5, list: 1, text: "", imgText: "kopp" },
  { id: 6, list: 1, text: "", imgText: "tallrik" },
  { id: 7, list: 1, text: "", imgText: "hund" },
  { id: 8, list: 1, text: "", imgText: "kylskåp" },
  { id: 9, list: 1, text: "", imgText: "burk" },
  { id: 10, list: 1, text: "", imgText: "hjälm" },
  { id: 11, list: 1, text: "", imgText: "tapet" },
  { id: 12, list: 1, text: "", imgText: "löv" },
  { id: 13, list: 1, text: "", imgText: "tröja" },
  { id: 14, list: 1, text: "", imgText: "resväska" },
  { id: 15, list: 1, text: "", imgText: "tårta" },
  { id: 16, list: 1, text: "", imgText: "citron" },
  { id: 17, list: 1, text: "", imgText: "cykel" },
  { id: 18, list: 1, text: "", imgText: "näsduk" },
  { id: 19, list: 1, text: "", imgText: "te" },
  { id: 20, list: 1, text: "", imgText: "program" },
  { id: 21, list: 1, text: "", imgText: "bandspelare" },
  { id: 22, list: 1, text: "", imgText: "vattenkran" },
  { id: 23, list: 1, text: "", imgText: "eluttag" },
  { id: 24, list: 1, text: "", imgText: "fönsterbräde" },
  { id: 25, list: 1, text: "", imgText: "socker" },
  { id: 26, list: 2, text: "", imgText: "bröd" },
  { id: 27, list: 2, text: "", imgText: "sked" },
  { id: 28, list: 2, text: "", imgText: "keps" },
  { id: 29, list: 2, text: "", imgText: "tofflor" },
  { id: 30, list: 2, text: "", imgText: "strumpor" },
  { id: 31, list: 2, text: "", imgText: "rör" },
  { id: 32, list: 2, text: "", imgText: "byxor" },
  { id: 33, list: 2, text: "", imgText: "handtag" },
  { id: 34, list: 2, text: "", imgText: "snäcka" },
  { id: 35, list: 2, text: "", imgText: "blomma" },
  { id: 36, list: 2, text: "", imgText: "pyjamas" },
  { id: 37, list: 2, text: "", imgText: "videokamera" },
  { id: 38, list: 2, text: "", imgText: "yoghurt" },
  { id: 39, list: 2, text: "", imgText: "honung" },
  { id: 40, list: 2, text: "", imgText: "kniv" },
  { id: 41, list: 2, text: "", imgText: "viol" },
  { id: 42, list: 2, text: "", imgText: "elkontakt" },
  { id: 43, list: 2, text: "", imgText: "tekanna" },
  { id: 44, list: 2, text: "", imgText: "apa" },
  { id: 45, list: 2, text: "", imgText: "jeep" },
  { id: 46, list: 2, text: "", imgText: "robot" },
  { id: 47, list: 2, text: "", imgText: "bollar" },
  { id: 48, list: 2, text: "", imgText: "etiketter" },
  { id: 49, list: 2, text: "", imgText: "godis" },
  { id: 50, list: 2, text: "", imgText: "rullskridskor" },
  { id: 101, list: 3, text: "01", imgText: "Näsa" },
  { id: 102, list: 3, text: "02", imgText: "Hår" },
  { id: 103, list: 3, text: "03", imgText: "Bulle" },
  { id: 104, list: 3, text: "04", imgText: "Val" },
  { id: 105, list: 3, text: "05", imgText: "Räv" },
  { id: 106, list: 3, text: "06", imgText: "yXa" },
  { id: 107, list: 3, text: "07", imgText: "Dörr" },
  { id: 108, list: 3, text: "08", imgText: "Lök" },
  { id: 109, list: 3, text: "09", imgText: "Cykel" },
  { id: 110, list: 3, text: "10", imgText: "aNeMon" },
];