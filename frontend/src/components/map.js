const React = require("react");
const { connect } = require("react-redux");
const mapboxgl = require("mapbox-gl");
const mapboxglGeoconder = require("mapbox-gl-geocoder");
const { rgbaObjectToString } = require("../utils");

const PlayerPanelConnected = require("./player-panel");
const { setCoordinates, showExportMenu } = require("../actions");

// TODO: Maybe types in object instead of this? Or some regex for '-color' ?
const parseValue = value => (typeof value === "object" ? rgbaObjectToString(value) : parseFloat(value));

mapboxgl.accessToken = process.env.MAPBOX_ACCESS_TOKEN;

const { Position, Toaster, Intent } = require("@blueprintjs/core");

const AppToaster = Toaster.create({
  className: "recipe-toaster",
  position: Position.TOP
});

const setupMap = map => {
  const sourceId = "osm";
  const layerId = "osm";

  const layers = {
    pts: [],
    lines: [],
    polygons: []
  };

  const highlighted = {
    pts: [],
    lines: [],
    polygons: []
  };

  const filters = {
    [`${layerId}-roads`]: [
      ["==", "$type", "LineString"],
      ["==", "@type", "way"],
      ["has", "highway"],
      ["!has", "building"],
      ["!has", "landuse"]
    ],
    [`${layerId}-buildings`]: [["==", "$type", "Polygon"], ["has", "building"]]
  };

  map.on("load", () => {
    // sources and layers
    map.addSource(sourceId, {
      type: "vector",
      tiles: [document.location.origin + "/api/tile/{z}/{x}/{y}"]
    });

    const firstSymbolId = map.getStyle().layers.filter(d => d.type === "symbol")[0].id;

    map.addLayer(
      {
        id: `${layerId}-buildings`,
        type: "line",
        source: `${sourceId}`,
        "source-layer": `${layerId}`,
        filter: ["all"].concat(filters[`${layerId}-buildings`]),
        layout: {
          "line-join": "round",
          "line-cap": "round"
        }
      },
      firstSymbolId
    );
    layers.polygons.push(`${layerId}-buildings`);

    map.addLayer(
      {
        id: `${layerId}-buildings-highlighted`,
        type: "line",
        source: `${sourceId}`,
        "source-layer": `${layerId}`,
        filter: ["all"].concat(filters[`${layerId}-buildings`]),
        layout: {
          "line-join": "round",
          "line-cap": "round"
        }
      },
      firstSymbolId
    );
    highlighted.polygons.push(`${layerId}-buildings-highlighted`);

    map.addLayer(
      {
        id: `${layerId}-roads`,
        type: "line",
        source: `${sourceId}`,
        "source-layer": `${layerId}`,
        filter: ["all"].concat(filters[`${layerId}-roads`]),
        layout: {
          "line-join": "round",
          "line-cap": "round"
        }
      },
      firstSymbolId
    );
    layers.lines.push(`${layerId}-roads`);

    map.addLayer(
      {
        id: `${layerId}-roads-highlighted`,
        type: "line",
        source: `${sourceId}`,
        "source-layer": `${layerId}`,
        filter: ["all"].concat(filters[`${layerId}-roads`]),
        layout: {
          "line-join": "round",
          "line-cap": "round"
        }
      },
      firstSymbolId
    );
    highlighted.lines.push(`${layerId}-roads-highlighted`);
  });

  return {
    filter: date => {
      const timestamp = date / 1000;

      const filter = ["all", ["<=", "@timestamp", timestamp]];

      const highlightedFilter = filter.concat([[">=", "@timestamp", timestamp - 86400]]);

      Object.keys(layers).forEach(layerGroupKey => {
        layers[layerGroupKey].forEach(layer => {
          map.setFilter(layer, filter.concat(filters[layer]));
        });
      });

      Object.keys(highlighted).forEach(layerGroupKey => {
        highlighted[layerGroupKey].forEach(layer => {
          map.setFilter(
            layer,
            highlightedFilter.concat(
              filters[
                layer
                  .split("-")
                  .slice(0, -1)
                  .join("-")
              ]
            )
          );
        });
      });
    },

    update: styles => {
      styles.features.forEach(feature => {
        const layerName = `${layerId}-${feature.name}`;
        const highlightedLayerName = `${layerName}-highlighted`;

        Object.keys(feature.base).forEach(styleName => {
          map.setPaintProperty(layerName, styleName, parseValue(feature.base[styleName]));
        });

        Object.keys(feature.highlight).forEach(styleName => {
          map.setPaintProperty(highlightedLayerName, styleName, parseValue(feature.highlight[styleName]));
        });

        // TODO: This should go out in future and we should manager to disable / enabled layers
        map.setPaintProperty(layerName, "line-opacity", !feature.enabled || !feature.baseEnabled ? 0 : 1);

        map.setPaintProperty(
          highlightedLayerName,
          "line-opacity",
          !feature.enabled || !feature.highlightEnabled ? 0 : 1
        );
      });
    }
  };
};

class Map extends React.Component {
  constructor(props) {
    super(props);
    this.state = { selectedDate: this.props.date.selected, subscribed: false };
  }

  initMap(props) {
    if (this.map) this.map.remove();
    this.map = new mapboxgl.Map({
      container: this.elMap,
      style: `mapbox://styles/mapbox/${props.style.background}-v9`,
      center: [props.mapCoordinates.lng, props.mapCoordinates.lat],
      zoom: props.mapCoordinates.zoom
    });

    this.map.addControl(new mapboxgl.NavigationControl());
    this.map.addControl(
      new mapboxglGeoconder({
        accessToken: mapboxgl.accessToken
      })
    );

    const { filter: filterMap, update: updateMap } = setupMap(this.map, props.style);
    this.filterMap = filterMap;
    this.updateMap = updateMap;

    this.map.on("move", () => {
      props.setCoordinates({
        lat: this.map.getCenter().lat,
        lng: this.map.getCenter().lng,
        zoom: this.map.getZoom()
      });
    });

    this.map.on("load", () => {
      this.updateMap(props.style);
      this.filterMap(this.state.selectedDate);
    });

    window.map = this.map;
  }

  componentDidMount() {
    this.initMap(this.props);
  }

  componententWillUmount() {
    this.map.remove();
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.date.selected !== nextProps.date.selected) {
      this.setState({ selectedDate: nextProps.date.selected }, this.handleDateChange);
    }

    this.updateMap(nextProps.style);

    if (this.props.style.background !== nextProps.style.background) {
      this.initMap(nextProps);
    }

    if (nextProps.mapCoordinates.zoom < 11 && AppToaster.getToasts().length < 1) {
      AppToaster.show({
        message: "Not supported zoom",
        intent: Intent.DANGER,
        timeout: 0,
        action: {
          onClick: () => this.map.setZoom(11),
          text: "Get me back to supported zoom levels"
        }
      });
    }

    if (nextProps.mapCoordinates.zoom >= 12) {
      AppToaster.clear();
    }
  }

  subscribeToSlider = () => {
    if (this.map.areTilesLoaded()) {
      this.filterMap(this.state.selectedDate);
      this.setState({ subscribed: false }, () => this.map.off("sourcedata", this.subscribeToSlider));
    }
  };

  handleDateChange() {
    if (this.map.areTilesLoaded()) {
      this.filterMap(this.state.selectedDate);
    } else if (!this.state.subscribed) {
      this.setState({ subscribed: true }, () => this.map.on("sourcedata", this.subscribeToSlider));
    }
  }

  render() {
    return (
      <div className="map">
        <div className="map-content" style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} ref={el => (this.elMap = el)} />
        </div>
        <PlayerPanelConnected />
      </div>
    );
  }
}

const MapConnected = connect(({ date, map, style }) => ({ date, mapCoordinates: map, style }), {
  setCoordinates,
  showExportMenu
})(Map);

module.exports = MapConnected;
