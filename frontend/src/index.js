const React = require("react");
const ReactDOM = require("react-dom");
const { Overlay } = require("@blueprintjs/core");
const set = require("lodash.set");
const moment = require("moment");
const { Provider, connect } = require("react-redux");

const configureStore = require("./store");

const Topbar = require("./components/topbar");
const MapConnected = require("./components/map");
const SidebarConnected = require("./components/sidebar");
const ExportMenu = require("./components/export-window");

require("normalize.css/normalize.css");
require("mapbox-gl/dist/mapbox-gl.css");
require("mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css");
require("@blueprintjs/core/lib/css/blueprint.css");
require("@blueprintjs/icons/lib/css/blueprint-icons.css");
require("@blueprintjs/datetime/lib/css/blueprint-datetime.css");

require("./style.less");

const store = configureStore();

const Main = ({ children }) => <div className="main">{children}</div>;

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      style: {
        roads: {
          enabled: true,
          base: {
            "line-color": {
              r: 2,
              g: 208,
              b: 202,
              a: 0.7
            },
            "line-width": 1
          },
          highlight: {
            enabled: true,
            "line-color": {
              r: 204,
              g: 245,
              b: 225,
              a: 0.5
            },
            "line-width": 1
          }
        },
        "buildings-outline": {
          enabled: true,
          base: {
            "line-color": {
              r: 208,
              g: 2,
              b: 68,
              a: 0.7
            },
            "line-width": 1
          },
          highlight: {
            enabled: true,
            "line-color": {
              r: 235,
              g: 150,
              b: 215,
              a: 1
            },
            "line-width": 1
          }
        }
      },
      displayExportMenu: false
    };
  }

  onStyleChange = (name, value) => {
    this.setState(set(this.state.style, name, value));
  };

  onShareClick = () => {
    this.setState({ displayExportMenu: true });
  };

  onOverlayClose = () => {
    this.setState({ displayExportMenu: false });
  };

  onRenderClick = ({ email, format, fps }) => {
    const mapConfig = {
      lat: this.state.lat,
      lng: this.state.lng,
      zoom: this.state.zoom,
      email,
      startDate: moment(this.state.date.start).toISOString(),
      endDate: moment(this.state.date.end).toISOString(),
      interval: this.state.interval,
      format,
      fps,
      style: this.state.style
    };

    fetch("/api/queue-render", {
      headers: {
        "Content-Type": "application/json"
      },
      method: "post",
      body: JSON.stringify(mapConfig)
    }).then(res => console.log(res));
  };

  render() {
    return (
      <div className="container">
        <Overlay isOpen={this.state.displayExportMenu} canOutsideClickClose={true} onClose={this.onOverlayClose}>
          <ExportMenu onRenderClick={this.onRenderClick} />
        </Overlay>

        <Topbar />

        <Main>
          <SidebarConnected style={this.state.style} onStyleChange={this.onStyleChange} />
          <MapConnected style={this.state.style} onShareClick={this.onShareClick} />
        </Main>
      </div>
    );
  }
}

const AppContainer = () => (
  <Provider store={store}>
    <App />
  </Provider>
);

ReactDOM.render(<AppContainer />, document.getElementById("app"));
