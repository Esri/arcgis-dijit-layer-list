define([
    "dojo/Evented",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/has",
    "esri/kernel",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/on",
    // load template    
    "dojo/text!application/dijit/templates/TableOfContents.html",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/dom-attr",
    "dojo/_base/array"
],
  function (
    Evented,
    declare,
    lang,
    has, esriNS,
    _WidgetBase, _TemplatedMixin,
    on,
    dijitTemplate,
    domClass, domStyle, domConstruct, domAttr,
    array
  ) {
    var Widget = declare("esri.dijit.TableOfContents", [_WidgetBase, _TemplatedMixin, Evented], {
      templateString: dijitTemplate,
      // defaults
      options: {
        theme: "TableOfContents",
        map: null,
        layers: null,
        visible: true
      },
      // lifecycle: 1
      constructor: function (options, srcRefNode) {
        // mix in settings and defaults
        var defaults = lang.mixin({}, this.options, options);
        // widget node
        this.domNode = srcRefNode;
        // properties
        this.set(defaults);
        // classes
        this.css = {
          container: "toc-container",
          layer: "toc-layer",
          firstLayer: "toc-first-layer",
          title: "toc-title",
          titleContainer: "toc-title-container",
          titleCheckbox: "toc-checkbox",
          titleLabel: "toc-label",
          visible: "toc-visible",
          clear: "toc-clear"
        };
      },

      postCreate: function () {
        var _self = this;
        // when checkbox is clicked
        this.own(on(this._layersNode, '.' + this.css.titleCheckbox + ':change', function () {
          var index = parseInt(domAttr.get(this, "data-layer-index"), 10);
          // toggle layer visibility
          _self._toggleLayer(index);
        }));
      },

      // start widget. called by user
      startup: function () {
        // map not defined
        if (!this.map) {
          console.error('TableOfContents::map required');
          return;
        }
        // when map is loaded
        if (this.map.loaded) {
          this._init();
        } else {
          on.once(this.map, "load", lang.hitch(this, function () {
            this._init();
          }));
        }
      },

      // connections/subscriptions will be cleaned up during the destroy() lifecycle phase
      destroy: function () {
        this._removeEvents();
        this.inherited(arguments);
      },
      /* ---------------- */
      /* Public Events */
      /* ---------------- */
      // load
      // toggle
      // expand
      // collapse
      /* ---------------- */
      /* Public Functions */
      /* ---------------- */

      show: function () {
        this.set("visible", true);
      },

      hide: function () {
        this.set("visible", false);
      },

      refresh: function () {
        this._createList();
      },

      /* ---------------- */
      /* Private Functions */
      /* ---------------- */
      _createList: function () {
        var layers = this.get("layers");
        this._nodes = [];
        // kill events
        this._removeEvents();
        // clear node
        this._layersNode.innerHTML = '';
        // if we got layers
        if (layers && layers.length) {
          for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            // layer class
            var layerClass = this.css.layer;
            var checked = false;
            // first layer
            if (i === (layers.length - 1)) {
              layerClass += " " + this.css.firstLayer;
            }
            // set checked state
            if (layer.visibility || layer.visible) {
              checked = true;
            }
            // checked class
            if (checked) {
              layerClass += " " + this.css.visible;
            }
            // layer node
            var layerDiv = domConstruct.create("div", {
              className: layerClass
            });
            domConstruct.place(layerDiv, this._layersNode, "first");
            // title of layer
            var titleDiv = domConstruct.create("div", {
              className: this.css.title
            }, layerDiv);
            // title container
            var titleContainerDiv = domConstruct.create("div", {
              className: this.css.titleContainer
            }, titleDiv);
            // Title checkbox
            var titleCheckbox = domConstruct.create("input", {
              type: "checkbox",
              id: this.id + "_checkbox_" + i,
              "data-layer-index": i,
              checked: checked,
              className: this.css.titleCheckbox
            }, titleContainerDiv);
            // Title text
            var title = layer.title || layer.id || "";
            var titleLabel = domConstruct.create("label", {
              for: this.id + "_checkbox_" + i,
              className: this.css.titleLabel,
              textContent: title
            }, titleContainerDiv);
            // clear css
            var clearCSS = domConstruct.create("div", {
              className: this.css.clear
            }, titleContainerDiv);
            // lets save all the nodes for events
            var nodesObj = {
              checkbox: titleCheckbox,
              title: titleDiv,
              titleContainer: titleContainerDiv,
              titleLabel: titleLabel,
              layer: layerDiv
            };
            this._nodes.push(nodesObj);
          }
          this._setLayerEvents();
        }
      },

      _removeEvents: function () {
        var i;
        // layer visibility events
        if (this._layerEvents && this._layerEvents.length) {
          for (i = 0; i < this._layerEvents.length; i++) {
            this._layerEvents[i].remove();
          }
        }
        this._layerEvents = [];
      },

      _toggleVisible: function (index, visible) {
        // update checkbox and layer visibility classes
        domClass.toggle(this._nodes[index].layer, this.css.visible, visible);
        domAttr.set(this._nodes[index].checkbox, "checked", visible);
        this.emit("toggle", {
          index: index,
          visible: visible
        });
      },

      _layerEvent: function (layer, index) {
        // layer visibility changes
        var visChange = on(layer, 'visibility-change', lang.hitch(this, function (evt) {
          // update checkbox and layer visibility classes
          this._toggleVisible(index, evt.visible);
        }));
        this._layerEvents.push(visChange);
      },

      // todo
      _featureCollectionVisible: function (layer, index, visible) {
        // all layers either visible or not
        var equal;
        // feature collection layers turned on by default
        var visibleLayers = layer.visibleLayers;
        // feature collection layers
        var layers = layer.featureCollection.layers;
        // if we have layers set
        if (visibleLayers && visibleLayers.length) {
          // check if all layers have same visibility
          equal = array.every(visibleLayers, function (item) {
            // check if current layer has same as first layer
            return layers[item].layerObject.visible === visible;
          });
        } else {
          // check if all layers have same visibility
          equal = array.every(layers, function (item) {
            // check if current layer has same as first layer
            return item.layerObject.visible === visible;
          });
        }
        // all are the same
        if (equal) {
          this._toggleVisible(index, visible);
        }
      },

      // todo
      _createFeatureLayerEvent: function (layer, index, i) {
        var layers = layer.featureCollection.layers;
        // layer visibility changes
        var visChange = on(layers[i].layerObject, 'visibility-change', lang.hitch(this, function (evt) {
          var visible = evt.visible;
          this._featureCollectionVisible(layer, index, visible);
        }));
        this._layerEvents.push(visChange);
      },

      // todo
      _featureLayerEvent: function (layer, index) {
        // feature collection layers
        var layers = layer.featureCollection.layers;
        if (layers && layers.length) {
          // make event for each layer
          for (var i = 0; i < layers.length; i++) {
            this._createFeatureLayerEvent(layer, index, i);
          }
        }
      },

      // todo
      _setLayerEvents: function () {
        // this function sets up all the events for layers
        var layers = this.get("layers");
        var layerObject;
        if (layers && layers.length) {
          // get all layers
          for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            // if it is a feature collection with layers
            if (layer.featureCollection && layer.featureCollection.layers && layer.featureCollection.layers.length) {
              this._featureLayerEvent(layer, i);
            } else if (this._isGraphicsLayer(layer)) {
              this._layerEvent(layer, i);
            } else {
              // 1 layer object
              layerObject = layer.layerObject;
              this._layerEvent(layerObject, i);
            }
          }
        }
      },

      _toggleLayer: function (layerIndex) {
        // all layers
        if (this.layers && this.layers.length) {
          var newVis;
          var layer = this.layers[layerIndex];
          var layerObject = layer.layerObject;
          var featureCollection = layer.featureCollection;
          var visibleLayers;
          var i;
          if (featureCollection) {
            // visible feature layers
            visibleLayers = layer.visibleLayers;
            // new visibility
            newVis = !layer.visibility;
            // set visibility for layer reference
            layer.visibility = newVis;
            // toggle all feature collection layers
            if (visibleLayers && visibleLayers.length) {
              // toggle visible sub layers
              for (i = 0; i < visibleLayers.length; i++) {
                layerObject = featureCollection.layers[visibleLayers[i]].layerObject;
                // toggle to new visibility
                layerObject.setVisibility(newVis);
              }
            } else {
              // toggle all sub layers
              for (i = 0; i < featureCollection.layers.length; i++) {
                layerObject = featureCollection.layers[i].layerObject;
                // toggle to new visibility
                layerObject.setVisibility(newVis);
              }
            }
          } else if (layerObject) {
            newVis = !layer.layerObject.visible;
            layer.visibility = newVis;
            layerObject.setVisibility(newVis);
          } else if (this._isGraphicsLayer(layer)) {
            newVis = !layer.visible;
            layer.setVisibility(newVis);
          }
        }
      },

      _isGraphicsLayer: function (layer) {
        var isGl = false;
        if (layer.url === null && layer.type === undefined) {
          isGl = true;
        }
        return isGl;
      },

      _init: function () {
        this._visible();
        this.refresh();
        this.set("loaded", true);
        this.emit("load", {});
      },

      _visible: function () {
        if (this.get("visible")) {
          domStyle.set(this.domNode, 'display', 'block');
        } else {
          domStyle.set(this.domNode, 'display', 'none');
        }
      },

      /* stateful properties */

      _setThemeAttr: function (newVal) {
        domClass.remove(this.domNode, this.theme);
        domClass.add(this.domNode, newVal);
        this._set("theme", newVal);
      },

      _setMapAttr: function (newVal) {
        this._set("map", newVal);
        if (this._created) {
          this.refresh();
        }
      },

      _setLayersAttr: function (newVal) {
        this._set("layers", newVal);
        if (this._created) {
          this.refresh();
        }
      },

      _setVisibleAttr: function (newVal) {
        this._set("visible", newVal);
        if (this._created) {
          this._visible();
        }
      }

    });
    if (has("extend-esri")) {
      lang.setObject("dijit.TableOfContents", Widget, esriNS);
    }
    return Widget;
  });