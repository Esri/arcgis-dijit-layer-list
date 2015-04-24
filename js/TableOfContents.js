define([
  "dojo/_base/array",
  "dojo/_base/declare",
  "dojo/_base/lang",

  "dojo/Evented",
  "dojo/Deferred",
  "dojo/has",
  "dojo/on",

  "dojo/dom-class",
  "dojo/dom-style",
  "dojo/dom-construct",
  "dojo/dom-attr",

  "dijit/_WidgetBase",
  "dijit/_TemplatedMixin",

  "esri/kernel",
  "esri/promiseList",

  "dojo/text!./TableOfContents/templates/TableOfContents.html"
],
  function (
    array, declare, lang,
    Evented, Deferred, has, on,
    domClass, domStyle, domConstruct, domAttr,
    _WidgetBase, _TemplatedMixin,
    esriNS, promiseList,
    dijitTemplate
  ) {
    var Widget = declare("esri.dijit.TableOfContents", [_WidgetBase, _TemplatedMixin, Evented], {

      templateString: dijitTemplate,

      options: {
        theme: "TableOfContents",
        map: null,
        layers: null,
        removeUnderscores: true,
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
        this.own(on(this._layersNode, "." + this.css.checkbox + ":change", function () {
          var data, subData, index, subIndex;
          // layer index
          data = domAttr.get(this, "data-layer-index");
          if (data) {
            index = parseInt(data, 10);
          }
          // subLayer index
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
          console.error("TableOfContents::map required");
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
        // all layer info
        var layers = this.layers;
        // store nodes here
        this._nodes = [];
        // kill events
        this._removeEvents();
        // clear node
        this._layersNode.innerHTML = "";
        var promises = [];
        // if we got layers
        if (layers && layers.length) {
          for (var i = 0; i < layers.length; i++) {
            promises.push(this._layerLoaded(i));
          }
        }
        // wait for layers to load or fail
        var pL = new promiseList(promises).always(lang.hitch(this, function (response) {
          this._loadedLayers = response;
          this._createLayerNodes();
          this._setLayerEvents();
        }));
        // return promise
        return pL;
      },

      /* ---------------- */
      /* Private Functions */
      /* ---------------- */

      _layerLoaded: function (layerIndex) {
        var layers = this.layers;
        var layerInfo = layers[layerIndex];
        var layer = this.map.getLayer(layerInfo.id);
        // returned event
        var evt = {
          layer: layer,
          layerInfo: layerInfo,
          layerIndex: layerIndex
        };
        var def = new Deferred();
        if (layer) {
          if (layer.loaded) {
            // nothing to do
            def.resolve(evt);
          } else if (layer.loadError) {
            def.reject(layer.loadError);
          } else {
            var loadedEvent, errorEvent;
            // once layer is loaded
            loadedEvent = on.once(layer, "load", lang.hitch(this, function () {
              errorEvent.remove();
              def.resolve(evt);
            }));
            // error occurred loading layer
            errorEvent = on.once(layer, "error", lang.hitch(this, function (error) {
              loadedEvent.remove();
              def.reject(error);
            }));
          }
        } else {
          def.resolve(evt);
        }
        return def.promise;
      },

      _checkboxStatus: function (layerInfo) {
        var checked = false;
        // set checked state
        if (layerInfo.visibility || layerInfo.visible) {
          checked = true;
        }
        return checked;
      },

      _subCheckboxStatus: function (layerInfo) {
        var checked = false;
        // set checked state
        if (layerInfo.defaultVisibility || layerInfo.visible) {
          checked = true;
        }
        return checked;
      },

      _getLayerTitle: function (evt) {
        var title = "";
        if (evt.layerInfo && evt.layerInfo.title) {
          title = evt.layerInfo.title;
        } else if (evt.layer && evt.layer.name) {
          title = evt.layer.name;
        } else if (evt.layerInfo && evt.layerInfo.id) {
          title = evt.layerInfo.id;
        }
        if (this.removeUnderscores) {
          title = title.replace(/_/g, " ");
        }
        return title;
      },

      _createLayerNodes: function () {
        var loadedLayers = this._loadedLayers;
        // create nodes for each layer
        for (var i = 0; i < loadedLayers.length; i++) {
          var response = loadedLayers[i];
          if (response) {
            var layer = response.layer;
            var layerIndex = response.layerIndex;
            var layerInfo = response.layerInfo;
            if (layerInfo) {
              var subLayers;
              // layer node
              var layerNode = domConstruct.create("li", {
                className: this.css.layer
              });
              domConstruct.place(layerNode, this._layersNode, "first");
              // title of layer
              var titleNode = domConstruct.create("div", {
                className: this.css.title
              }, layerNode);
              // nodes for subLayers
              var subNodes = [];
              var layerType = layerInfo.layerType;
              // get parent layer checkbox status
              var status = this._checkboxStatus(layerInfo);
              // title container
              var titleContainerNode = domConstruct.create("div", {
                className: this.css.titleContainer
              }, titleNode);
              // Title checkbox
              var checkboxNode = domConstruct.create("input", {
                type: "checkbox",
                id: this.id + "_checkbox_" + layerIndex,
                "data-layer-index": layerIndex,
                checked: status,
                className: this.css.checkbox
              }, titleContainerNode);
              // Title text
              var title = this._getLayerTitle(response);
              var labelNode = domConstruct.create("label", {
                for: this.id + "_checkbox_" + layerIndex,
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
              this._nodes[layerIndex] = nodesObj;

              // todo 1.0: GeoRSS layers subLayers
              // todo 1.0: WMS layers subLayers

              if (layer) {
                // subLayers from thier info
                subLayers = layer.layerInfos;
                // KML subLayers
                if (layerType === "KML") {
                  subLayers = layer.folders;
                }
                // if we have more than one subLayer and layer is of valid type for subLayers
                if (layerType !== "ArcGISTiledMapServiceLayer" && subLayers && subLayers.length) {
                  // create subLayer list
                  var subListNode = domConstruct.create("ul", {
                    className: this.css.subList
                  }, layerNode);
                  // create each subLayer item
                  for (var j = 0; j < subLayers.length; j++) {
                    // subLayer info
                    var subLayer = subLayers[j];
                    var subLayerIndex = subLayer.id;
                    var parentId;
                    if (layerType === "KML") {
                      parentId = subLayer.parentFolderId;
                    } else if (layerType === "WMS") {
                      parentId = -1;
                    } else {
                      parentId = subLayer.parentLayerId;
                    }
                    // place subLayers not in the root
                    if (parentId !== -1) {
                      subListNode = domConstruct.create("ul", {
                        className: this.css.subList
                      }, this._nodes[layerIndex].subNodes[parentId].subLayer);
                    }
                    // default checked state
                    var subChecked = this._subCheckboxStatus(subLayer);
                    // list item node
                    var subLayerNode = domConstruct.create("li", {
                      className: this.css.subListLayer
                    }, subListNode);
                    // title of subLayer layer
                    var subTitleNode = domConstruct.create("div", {
                      className: this.css.title
                    }, subLayerNode);
                    // subLayer title container
                    var subTitleContainerNode = domConstruct.create("div", {
                      className: this.css.titleContainer
                    }, subTitleNode);
                    // subLayer checkbox
                    var subCheckboxNode = domConstruct.create("input", {
                      type: "checkbox",
                      id: this.id + "_checkbox_sub_" + layerIndex + "_" + subLayerIndex,
                      "data-layer-index": layerIndex,
                      "data-sublayer-index": subLayerIndex,
                      checked: subChecked,
                      className: this.css.checkbox
                    }, subTitleContainerNode);
                    // subLayer Title text
                    var subTitle = subLayer.name || "";
                    var subLabelNode = domConstruct.create("label", {
                      for: this.id + "_checkbox_sub_" + layerIndex + "_" + subLayerIndex,
                      className: this.css.label,
                      textContent: subTitle
                    }, subTitleContainerNode);
                    // subLayer clear css
                    var subClearNode = domConstruct.create("div", {
                      className: this.css.clear
                    }, subTitleContainerNode);
                    // object of subLayer nodes
                    var subNode = {
                      subList: subListNode,
                      subLayer: subLayerNode,
                      subTitle: subTitleNode,
                      subTitleContainer: subTitleContainerNode,
                      subCheckbox: subCheckboxNode,
                      subLabel: subLabelNode,
                      subClear: subClearNode
                    };
                    // add node to array
                    subNodes[subLayerIndex] = subNode;
                  }
                }
              }
            }
          }
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
          // all subLayers
          var fcLayers = layer.featureCollection.layers;
          // current layer object to setup event for
          layerObject = fcLayers[subLayerIndex].layerObject;
        } else {
          // layer object for event
          layerObject = layer.layerObject;
        }
        // layer visibility changes
        var visChange = on(layerObject, "visibility-change", lang.hitch(this, function (evt) {
          if (featureCollection) {
            this._featureCollectionVisible(index, evt.visible);
          } else {
            // update checkbox and layer visibility classes
            this._toggleVisible(index, null, evt.visible);
          }
        }));
        this._layerEvents.push(visChange);

        // todo 2.0: out of scale range
        /* 
        // scale visibility changes
        var scaleVisChange = on(layerObject, "scale-visibility-change", lang.hitch(this, function (evt) {
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
            var subVisChange = on(layerObject, "visible-layers-change", lang.hitch(this, function (evt) {
              // new visible layers
              var visibleLayers = evt.visibleLayers;
              // all subLayer info
              var layerInfos = layerObject.layerInfos;
              // go through all subLayers
              for (var i = 0; i < layerInfos.length; i++) {
                var subLayerIndex = layerInfos[i].id;
                // is subLayer in visible layers array
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
          var visibleLayers, visibleFolders;
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
          // layer
          else if (layerObject) {
            var layerInfos = layerObject.layerInfos;
            // setting subLayer visibility
            if (typeof subLayerIndex !== "undefined" && layerObject.hasOwnProperty("visibleLayers")) {
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

            // todo use layertype throughout
            else if (typeof subLayerIndex !== "undefined") {


              var folders = layerObject.folders;
              // for each sublayer
              for (i = 0; i < folders.length; i++) {
                var folder = folders[i];
                if (folder.id === subLayerIndex) {

                  console.log(folder.id, subLayerIndex, folder);

                  layerObject.setFolderVisibility(folder, !folder.visible);
                  break;
                }
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
          // other layer type
          else {
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

      _init: function () {
        this._visible();
        this.refresh().always(lang.hitch(this, function () {
          this.set("loaded", true);
          this.emit("load", {});
        }));
      },

      _visible: function () {
        if (this.visible) {
          domStyle.set(this.domNode, "display", "block");
        } else {
          domStyle.set(this.domNode, "display", "none");
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