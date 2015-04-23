define([
  "dojo/_base/array",
  "dojo/_base/declare",
  "dojo/_base/lang",

  "dojo/Evented",
  "dojo/has",
  "dojo/on",

  "dojo/dom-class",
  "dojo/dom-style",
  "dojo/dom-construct",
  "dojo/dom-attr",

  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",

  "esri/kernel",

  "dojo/text!./TableOfContents/templates/TableOfContents.html"
],
  function (
    array, declare, lang,
    Evented, has, on,
    domClass, domStyle, domConstruct, domAttr,
    _WidgetBase, _TemplatedMixin,
    esriNS,
    dijitTemplate
  ) {
    var Widget = declare("esri.dijit.TableOfContents", [_WidgetBase, _TemplatedMixin, Evented], {

      templateString: dijitTemplate,

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
          container: "tocContainer",
          list: "tocList",
          subList: "tocSubList",
          subListLayer: "tocSubListLayer",
          layer: "tocLayer",
          title: "tocTitle",
          titleContainer: "tocTitleContainer",
          checkbox: "tocCheckbox",
          label: "tocLabel",
          clear: "tocClear"
        };
      },

      postCreate: function () {
        var _self = this;
        // when checkbox is clicked
        this.own(on(this._layersNode, '.' + this.css.checkbox + ':change', function () {
          var data, subData, index, subIndex;
          // layer index
          data = domAttr.get(this, "data-layer-index");
          if (data) {
            index = parseInt(data, 10);
          }
          // sublayer index
          subData = domAttr.get(this, "data-sublayer-index");
          if (subData) {
            subIndex = parseInt(subData, 10);
          }
          // toggle layer visibility
          _self._toggleLayer(index, subIndex);
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

      _checkboxStatus: function (layerIndex) {
        // get layer
        var layer = this.layers[layerIndex];
        var checked = false;
        // set checked state
        if (layer.visibility || layer.visible) {
          checked = true;
        }
        return checked;
      },

      _createList: function () {
        var layers = this.layers;
        this._nodes = [];
        // kill events
        this._removeEvents();
        // clear node
        this._layersNode.innerHTML = '';
        // if we got layers
        if (layers && layers.length) {
          for (var i = 0; i < layers.length; i++) {
            
            // todo sublayers for multiple levels.
            
            // todo kml layers sublayers
            
            
            var sublayers;
            var layer = layers[i];
            var layerObject = layer.layerObject;
            if (layerObject) {
              // sublayers from thier info
              sublayers = layerObject.layerInfos;
            }
            // layer node
            var layerNode = domConstruct.create("li", {
              className: this.css.layer
            });
            domConstruct.place(layerNode, this._layersNode, "first");
            // title of layer
            var titleNode = domConstruct.create("div", {
              className: this.css.title
            }, layerNode);
            // nodes for sublayers
            var subNodes = [];
            var layerType = layer.layerType;
            // if we have more than one sublayer and layer is of valid type for sublayers
            if (layerType !== "ArcGISTiledMapServiceLayer" && sublayers && sublayers.length && sublayers.length) {
              // create sublayer list
              var subList = domConstruct.create("ul", {
                className: this.css.subList
              }, layerNode);
              // create each sublayer item
              for (var j = 0; j < sublayers.length; j++) {
                // sublayer info
                var sublayer = sublayers[j];
                // default checked state
                var subChecked = sublayer.defaultVisibility;
                // list item node
                var subLayerNode = domConstruct.create("li", {
                  className: this.css.subListLayer
                }, subList);
                // title of sublayer layer
                var subTitleNode = domConstruct.create("div", {
                  className: this.css.title
                }, subLayerNode);
                // sublayer title container
                var subTitleContainerNode = domConstruct.create("div", {
                  className: this.css.titleContainer
                }, subTitleNode);
                // sublayer checkbox
                var subCheckboxNode = domConstruct.create("input", {
                  type: "checkbox",
                  id: this.id + "_checkbox_sub_" + i + "_" + j,
                  "data-layer-index": i,
                  "data-sublayer-index": j,
                  checked: subChecked,
                  className: this.css.checkbox
                }, subTitleContainerNode);
                // sublayer Title text
                var subTitle = sublayer.name || "";
                var subLabelNode = domConstruct.create("label", {
                  for: this.id + "_checkbox_sub_" + i + "_" + j,
                  className: this.css.label,
                  textContent: subTitle
                }, subTitleContainerNode);
                // sublayer clear css
                var subClearNode = domConstruct.create("div", {
                  className: this.css.clear
                }, subTitleContainerNode);
                // object of sublayer nodes
                var subNode = {
                  subLayer: subLayerNode,
                  subTitle: subTitleNode,
                  subTitleContainer: subTitleContainerNode,
                  subCheckbox: subCheckboxNode,
                  subLabel: subLabelNode,
                  subClear: subClearNode
                };
                // add node to array
                subNodes.push(subNode);
              }
            }
            // get parent layer checkbox status
            var status = this._checkboxStatus(i);
            // title container
            var titleContainerNode = domConstruct.create("div", {
              className: this.css.titleContainer
            }, titleNode);
            // Title checkbox
            var checkboxNode = domConstruct.create("input", {
              type: "checkbox",
              id: this.id + "_checkbox_" + i,
              "data-layer-index": i,
              checked: status,
              className: this.css.checkbox
            }, titleContainerNode);
            // Title text
            var title = layer.title || layer.id || "";
            var labelNode = domConstruct.create("label", {
              for: this.id + "_checkbox_" + i,
              className: this.css.label,
              textContent: title
            }, titleContainerNode);
            // clear css
            var clearNode = domConstruct.create("div", {
              className: this.css.clear
            }, titleContainerNode);
            // lets save all the nodes for events
            var nodesObj = {
              checkbox: checkboxNode,
              title: titleNode,
              titleContainer: titleContainerNode,
              label: labelNode,
              layer: layerNode,
              clear: clearNode,
              subNodes: subNodes
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

      _toggleVisible: function (index, subIndex, visible) {
        // if its a sublayer
        if (subIndex !== null) {
          // update checkbox and layer visibility classes
          domAttr.set(this._nodes[index].subNodes[subIndex].subCheckbox, "checked", visible);
        }
        // parent layer
        else {
          // update checkbox and layer visibility classes
          domAttr.set(this._nodes[index].checkbox, "checked", visible);
        }
        // emit event
        this.emit("toggle", {
          layerIndex: index,
          subLayerIndex: subIndex,
          visible: visible
        });
      },

      _layerVisChangeEvent: function (index, featureCollection, subLayerIndex) {
        var layers = this.layers;
        var layer = layers[index];
        var layerObject;
        // layer is a feature collection
        if (featureCollection) {
          // all sublayers
          var fcLayers = layer.featureCollection.layers;
          // current layer object to setup event for
          layerObject = fcLayers[subLayerIndex].layerObject;
        } else {
          // layer object for event
          layerObject = layer.layerObject;
        }
        // layer visibility changes
        var visChange = on(layerObject, 'visibility-change', lang.hitch(this, function (evt) {
          if (featureCollection) {
            this._featureCollectionVisible(index, evt.visible);
          } else {
            // update checkbox and layer visibility classes
            this._toggleVisible(index, null, evt.visible);
          }
        }));
        this._layerEvents.push(visChange);
        
        // todo 2.0 out of scale range
        /* 
        // scale visibility changes
        var scaleVisChange = on(layerObject, 'scale-visibility-change', lang.hitch(this, function (evt) {
          var layer = evt.target;
          var visible = layer.visibleAtMapScale;
          
          console.log(layer);
          
          if(visible){
            
          }
          else{
            
          }
        }));
        this._layerEvents.push(scaleVisChange);
        */
        
      },

      _layerEvent: function (index) {
        var layers = this.layers;
        var layer = layers[index];
        var layerObject = layer.layerObject;
        // feature collection events
        if (layer.featureCollection && layer.featureCollection.layers && layer.featureCollection.layers.length) {
          // feature collection layers
          var fsLayers = layer.featureCollection.layers;
          if (fsLayers && fsLayers.length) {
            // make event for each layer
            for (var i = 0; i < fsLayers.length; i++) {
              // layer visibility changes
              this._layerVisChangeEvent(index, true, i);
            }
          }
        } else {
          // layer visibility changes
          this._layerVisChangeEvent(index, false, null);
          // if we have a map service
          if (layer.layerType && layer.layerType === "ArcGISMapServiceLayer") {
            var subVisChange = on(layerObject, 'visible-layers-change', lang.hitch(this, function (evt) {
              // new visible layers
              var visibleLayers = evt.visibleLayers;
              // all sublayer info
              var layerInfos = layerObject.layerInfos;
              // go through all sublayers
              for (var i = 0; i < layerInfos.length; i++) {
                var subLayerIndex = layerInfos[i].id;
                // is sublayer in visible layers array
                var found = array.indexOf(visibleLayers, subLayerIndex);
                // not found
                if (found === -1) {
                  layerInfos[subLayerIndex].defaultVisibility = false;
                  this._toggleVisible(index, subLayerIndex, false);
                }
                // found
                else {
                  layerInfos[subLayerIndex].defaultVisibility = true;
                  this._toggleVisible(index, subLayerIndex, true);
                }
              }
            }));
            this._layerEvents.push(subVisChange);
          }
        }
      },

      _toggleLayer: function (layerIndex, subLayerIndex) {
        // all layers
        if (this.layers && this.layers.length) {
          var newVis;
          var layer = this.layers[layerIndex];
          var layerObject = layer.layerObject;
          var featureCollection = layer.featureCollection;
          var visibleLayers;
          var i;
          // feature collection layer
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
          }
          // map service
          else if (layerObject) {
            var layerInfos = layerObject.layerInfos;
            // setting sublayer visibility
            if (typeof subLayerIndex !== 'undefined' && layerObject.hasOwnProperty('visibleLayers')) {
              // array for setting visible layers
              visibleLayers = [-1];
              newVis = !layerInfos[subLayerIndex].defaultVisibility;
              // reverse current visibility of sublayer
              layerInfos[subLayerIndex].defaultVisibility = newVis;
              // for each sublayer
              for (i = 0; i < layerInfos.length; i++) {
                var info = layerInfos[i];
                // push to visible layers if it's visible
                if (info.defaultVisibility) {
                  visibleLayers.push(info.id);
                  var negative = array.lastIndexOf(visibleLayers, -1);
                  if (negative !== -1) {
                    visibleLayers.splice(negative, 1);
                  }
                }
              }
              if (layerObject.setVisibleLayers && typeof layerObject.setVisibleLayers === "function") {
                layerObject.setVisibleLayers(visibleLayers);
              }
            }
            // parent map layer
            else {
              // reverse current visibility of parent layer
              newVis = !layer.layerObject.visible;
              // new visibility of parent layer
              layer.visibility = newVis;
              layerObject.setVisibility(newVis);
            }
          }
          // todo ? graphics layer support test
          else if (this._isGraphicsLayer(layer)) {
            newVis = !layer.visible;
            layer.setVisibility(newVis);
          }
        }
      },

      _featureCollectionVisible: function (index, visible) {
        var layer = this.layers[index];
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
          this._toggleVisible(index, null, visible);
        }
      },

      _setLayerEvents: function () {
        // this function sets up all the events for layers
        var layers = this.layers;
        if (layers && layers.length) {
          // get all layers
          for (var i = 0; i < layers.length; i++) {
            // create necessary events
            this._layerEvent(i);
          }
        }
      },

      // todo test graphics layer
      _isGraphicsLayer: function (layer) {
        var isGl = false;
        if (layer.url === null && layer.type === undefined) {
          console.log(layer);
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
        if (this.visible) {
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