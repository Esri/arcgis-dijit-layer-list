define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/has",
    "esri/kernel",
    "dijit/_WidgetBase",
    "dijit/_OnDijitClickMixin",
    "dijit/_TemplatedMixin",
    "dojo/on",
    "dojo/query",
    // load template    
    "dojo/text!zesri/dijit/templates/LayerLegend.html",
    "dojo/i18n!zesri/nls/jsapi",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "esri/dijit/Legend",
    "dojo/_base/event"
],
function (
    Evented,
    declare,
    lang,
    has, esriNS,
    _WidgetBase, _OnDijitClickMixin, _TemplatedMixin,
    on,
    query,
    dijitTemplate, i18n,
    domClass, domStyle, domConstruct, domAttr,
    Legend,
    event
) {
    var Widget = declare([_WidgetBase, _OnDijitClickMixin, _TemplatedMixin, Evented], {
        declaredClass: "esri.dijit.LayerLegend",
        templateString: dijitTemplate,
        options: {
            theme: "LayerLegend",
            map: null,
            layers: null,
            visible: true
        },
        // lifecycle: 1
        constructor: function(options, srcRefNode) {
            // mix in settings and defaults
            declare.safeMixin(this.options, options);
            // widget node
            this.domNode = srcRefNode;
            this._i18n = i18n;
            // properties
            this.set("map", this.options.map);
            this.set("layers", this.options.layers);
            this.set("theme", this.options.theme);
            this.set("visible", this.options.visible);
            // listeners
            this.watch("theme", this._updateThemeWatch);
            this.watch("visible", this._visible);
            // classes
            this._css = {
                container: "LL_Container",
                layer: "LL_Layer",
                firstLayer: "LL_FirstLayer",
                legend: "LL_Legend",
                title: "LL_Title",
                content: "LL_Content",
                titleCheckbox: "LL_Checkbox",
                titleText: "LL_Text",
                selected: "LL_Selected",
                visible: "LL_Visible"
            };
        },
        // start widget. called by user
        startup: function() {
            // map not defined
            if (!this.map) {
                this.destroy();
                console.log('LayerLegend::map required');
            }
            // when map is loaded
            if (this.map.loaded) {
                this._init();
            } else {
                on(this.map, "load", lang.hitch(this, function() {
                    this._init();
                }));
            }
        },
        // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
        destroy: function() {
            this.inherited(arguments);
        },
        /* ---------------- */
        /* Public Events */
        /* ---------------- */
        // load
        /* ---------------- */
        /* Public Functions */
        /* ---------------- */
        show: function(){
            this.set("visible", true);  
        },
        hide: function(){
            this.set("visible", false);
        },
        /* ---------------- */
        /* Private Functions */
        /* ---------------- */
        _createLegends: function(){
            var layers = this.get("layers");
            if(layers && layers.length){
                for(var i = 0; i < layers.length; i++){
                    var layer = layers[i];
                    var firstLayer = '';
                    if(i == 0){
                        firstLayer = ' ' + this._css.firstLayer;
                    }
                    var visible = '';
                    if(layer.visibility){
                        visible = ' ' + this._css.visible;
                    }
                    // layer node
                    var layerDiv = domConstruct.create("div", {
                        className: this._css.layer + firstLayer + visible
                    });
                    domConstruct.place(layerDiv, this._layersNode, "last");
                    // title of layer
                    var titleDiv = domConstruct.create("div", {
                        className: this._css.title,
                    });
                    domConstruct.place(titleDiv, layerDiv, "last");
                    // Title checkbox
                    var titleCheckbox = domConstruct.create("span", {
                        className: this._css.titleCheckbox
                    });
                    domAttr.set(titleCheckbox, 'data-layer', i);
                    domConstruct.place(titleCheckbox, titleDiv, "last");
                    // Title text
                    var titleText = domConstruct.create("span", {
                        className: this._css.titleText,
                        innerHTML: layer.title
                    });
                    domConstruct.place(titleText, titleDiv, "last");
                    // content of layer
                    var contentDiv = domConstruct.create("div", {
                        className: this._css.content
                    });
                    domConstruct.place(contentDiv, layerDiv, "last");
                    // legend
                    var legendDiv = domConstruct.create("div", {
                        className: this._css.legend
                    });
                    var defaultSymbol = null;
                    if(layer.layerObject.renderer && layer.layerObject.renderer.defaultSymbol){
                        defaultSymbol = layer.layerObject.renderer.defaultSymbol;
                    }  
                    var legend = new Legend({
                        map: this.get("map"),
                        layerInfos: [{
                            title: layer.title,
                            layer:layer.layerObject,
                            defaultSymbol: defaultSymbol
                        }]
                    }, legendDiv);
                    domConstruct.place(legendDiv, contentDiv, "first");
                    legend.startup();
                    // create click event
                    this._titleEvent(titleDiv, layerDiv);
                    // create click event
                    this._checkboxEvent(titleCheckbox, layerDiv);
                }
            }
        },
        _toggleLayer: function(i){
            var layers = this.get("layers");
            var layer = layers[i];
            console.log(layer);
            
            
            if(layer.featureCollection && layer.featureCollection.layers){
                var sublayers = layer.featureCollection.layers;
                for(var i = 0; i < sublayers.length; i++){
                    var lyr = this.get("map").getLayer(sublayers[i].id);
                    lyr.setVisibility(!lyr.visible);
                }
            }
            else{
                var lyr = this.get("map").getLayer(layer.id);
                lyr.setVisibility(!lyr.visible);
            }
            
            
        },
        _checkboxEvent: function(checkboxNode, layerNode){
            on(checkboxNode, 'click', lang.hitch(this, function(evt){
                domClass.toggle(layerNode, this._css.visible);
                var layer = parseInt(domAttr.get(evt.currentTarget, 'data-layer') , 10);
                this._toggleLayer(layer);
                event.stop(evt);
            }));
        },
        _titleEvent: function(titleNode, layerNode){
            on(titleNode, 'click', lang.hitch(this, function(){
                if(!domClass.contains(layerNode, this._css.selected)){
                    // remove all selected 
                    var nodes = query('.' + this._css.selected, this._layersNode);
                    for(var i = 0; i < nodes.length; i++){
                        domClass.remove(nodes[i], this._css.selected);   
                    }
                }
                domClass.toggle(layerNode, this._css.selected);
            }));  
        },
        _init: function() {
            this._visible();
            this._createLegends();
            this.set("loaded", true);
            this.emit("load", {});
        },
        _updateThemeWatch: function(attr, oldVal, newVal) {
            domClass.remove(this.domNode, oldVal);
            domClass.add(this.domNode, newVal);
        },
        _visible: function(){
            if(this.get("visible")){
                domStyle.set(this.domNode, 'display', 'block');
            }
            else{
                domStyle.set(this.domNode, 'display', 'none');
            }
        }
    });
    if (has("extend-esri")) {
        lang.setObject("dijit.LayerLegend", Widget, esriNS);
    }
    return Widget;
});