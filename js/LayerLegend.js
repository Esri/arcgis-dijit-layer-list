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
    "dojo/text!modules/dijit/templates/LayerLegend.html",
    "dojo/i18n!modules/nls/LayerLegend",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
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
    domClass, domStyle, domConstruct,
    Legend,
    event
) {
    var Widget = declare([_WidgetBase, _OnDijitClickMixin, _TemplatedMixin, Evented], {
        declaredClass: "esri.dijit.LayerLegend",
        templateString: dijitTemplate,
        // defaults
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
                titleContainer: "LL_TitleContainer",
                content: "LL_Content",
                titleCheckbox: "LL_Checkbox",
                checkboxCheck: "icon-check-1",
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
        show: function() {
            this.set("visible", true);
        },
        hide: function() {
            this.set("visible", false);
        },
        /* ---------------- */
        /* Private Functions */
        /* ---------------- */
        _createLegends: function() {
            var layers = this.get("layers");
            this._nodes = [];
            if (layers && layers.length) {
                for (var i = 0; i < layers.length; i++) {
                    var layer = layers[i];
                    var firstLayer = '';
                    if (i === (layers.length - 1)) {
                        firstLayer = ' ' + this._css.firstLayer + ' ' + this._css.selected;
                    }
                    var visible = '',
                        checked = '';
                    if (layer.visibility) {
                        visible = ' ' + this._css.visible;
                        checked = ' ' + this._css.checkboxCheck;
                    }
                    // layer node
                    var layerDiv = domConstruct.create("div", {
                        className: this._css.layer + firstLayer + visible
                    });
                    domConstruct.place(layerDiv, this._layersNode, "first");
                    // title of layer
                    var titleDiv = domConstruct.create("div", {
                        className: this._css.title,
                    });
                    domConstruct.place(titleDiv, layerDiv, "last");
                    // title container
                    var titleContainerDiv = domConstruct.create("div", {
                        className: this._css.titleContainer,
                    });
                    domConstruct.place(titleContainerDiv, titleDiv, "last");
                    // Title checkbox
                    var titleCheckbox = domConstruct.create("span", {
                        className: this._css.titleCheckbox + checked
                    });
                    domConstruct.place(titleCheckbox, titleContainerDiv, "last");
                    // Title text
                    var titleText = domConstruct.create("span", {
                        className: this._css.titleText,
                        title: layer.title,
                        innerHTML: layer.title
                    });
                    domConstruct.place(titleText, titleContainerDiv, "last");
                    // content of layer
                    var contentDiv = domConstruct.create("div", {
                        className: this._css.content
                    });
                    domConstruct.place(contentDiv, layerDiv, "last");
                    // legend
                    var legendDiv = domConstruct.create("div", {
                        className: this._css.legend
                    });
                    domConstruct.place(legendDiv, contentDiv, "first");
                    // determine default symbol
                    var defaultSymbol;
                    try {
                        defaultSymbol = layer.layerObject.renderer.defaultSymbol;
                    } catch (error) {
                        try {
                            defaultSymbol = layer.featureCollection.layers[0].layerObject.rendererer.defaultSymbol;
                        } catch (error2) {
                            defaultSymbol = null;
                        }
                    }
                    // whether to show legend or not
                    var showLegend = true;
                    if (layer.featureCollection && layer.featureCollection.hasOwnProperty('showLegend')) {
                        showLegend = layer.featureCollection.showLegend;
                    }
                    if (showLegend) {
                        // create legend
                        var legend = new Legend({
                            map: this.get("map"),
                            layerInfos: [{
                                title: layer.title,
                                layer: layer.layerObject,
                                defaultSymbol: defaultSymbol
                            }]
                        }, legendDiv);
                        legend.startup();
                    } else {
                        // no legend to create
                        legendDiv.innerHTML = this._i18n.LayerLegend.noLegend;
                    }
                    // lets save all the nodes for events
                    var nodesObj = {
                        checkbox: titleCheckbox,
                        title: titleDiv,
                        titleContainer: titleContainerDiv,
                        titleText: titleText,
                        content: contentDiv,
                        legend: legendDiv,
                        layer: layerDiv
                    };
                    this._nodes.push(nodesObj);
                    // create click event
                    this._titleEvent(i);
                    // create click event
                    this._checkboxEvent(i);
                }
            }
        },
        _toggleVisible: function(index, visible) {
            // update checkbox and layer visibility classes
            domClass.toggle(this._nodes[index].layer, this._css.visible, visible);
            domClass.toggle(this._nodes[index].checkbox, this._css.checkboxCheck, visible);
        },
        _visibilityEvent: function(layer, index) {
            // layer visibility changes
            on(layer, 'visibility-change', lang.hitch(this, function(evt) {
                // update checkbox and layer visibility classes
                this._toggleVisible(index, evt.visible);
            }));
        },
        _setLayerObjects: function() {
            // this function gets all the layer objects for each layer and sublayers.
            var layers = this.get("layers");
            var layerObjects = [];
            if (layers && layers.length) {
                // get all layers
                for (var i = 0; i < layers.length; i++) {
                    var layer = layers[i];
                    // layer object with layers/sublayers and visibility
                    var obj = {
                        layers: [],
                        visibility: layer.visibility
                    };
                    // if it is a featurecollection with sublayers
                    if (layer.featureCollection && layer.featureCollection.layers && layer.featureCollection.layers.length) {
                        var sublayers = layer.featureCollection.layers;
                        for (var j = 0; j < sublayers.length; j++) {
                            var sublayerObject = sublayers[j].layerObject;
                            this._visibilityEvent(sublayerObject, i);
                            obj.layers.push(sublayerObject);
                        }
                    } else {
                        // 1 layer object
                        var layerObject = layer.layerObject;
                        this._visibilityEvent(layerObject, i);
                        obj.layers.push(layerObject);
                    }
                    layerObjects.push(obj);
                }
                this.set("layerObjects", layerObjects);
            }
        },
        _toggleLayer: function(index) {
            // all layers
            var layerObjects = this.get("layerObjects");
            if (layerObjects && layerObjects.length) {
                var layerObject = layerObjects[index];
                // toggle visibility
                layerObject.visibility = !layerObject.visibility;
                var layers = layerObjects[index].layers;
                // all layers/sublayers
                if (layers && layers.length) {
                    for (var i = 0; i < layers.length; i++) {
                        var layer = layers[i];
                        // toggle to new visibility
                        layer.setVisibility(layerObject.visibility);
                    }
                }
            }
            this.set("layerObjects", layerObjects);
        },
        _checkboxEvent: function(index) {
            // when checkbox is clicked
            on(this._nodes[index].checkbox, 'click', lang.hitch(this, function(evt) {
                // toggle layer visibility
                this._toggleLayer(index);
                event.stop(evt);
            }));
        },
        _titleEvent: function(index) {
            // when a title of a layer has been clicked
            on(this._nodes[index].title, 'click', lang.hitch(this, function() {
                // title is not already selected
                if (!domClass.contains(this._nodes[index].layer, this._css.selected)) {
                    // remove all selected 
                    var nodes = query('.' + this._css.selected, this._layersNode);
                    for (var i = 0; i < nodes.length; i++) {
                        domClass.remove(nodes[i], this._css.selected);
                    }
                }
                // toggle selected class
                domClass.toggle(this._nodes[index].layer, this._css.selected);
            }));
        },
        _init: function() {
            this._visible();
            this._createLegends();
            this._setLayerObjects();
            this.set("loaded", true);
            this.emit("load", {});
        },
        _updateThemeWatch: function(attr, oldVal, newVal) {
            domClass.remove(this.domNode, oldVal);
            domClass.add(this.domNode, newVal);
        },
        _visible: function() {
            if (this.get("visible")) {
                domStyle.set(this.domNode, 'display', 'block');
            } else {
                domStyle.set(this.domNode, 'display', 'none');
            }
        }
    });
    if (has("extend-esri")) {
        lang.setObject("dijit.LayerLegend", Widget, esriNS);
    }
    return Widget;
});