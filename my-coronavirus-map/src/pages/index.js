import React, { useRef, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Helmet } from "react-helmet";
import L from "leaflet";
import { Marker, useMap } from "react-leaflet";
import axios from "axios";

import { getCurrentLocation } from "lib/map";

import Layout from "components/Layout";
import Container from "components/Container";
import Map from "components/Map";

const LOCATION = {
  lat: 0,
  lng: 0,
};
const CENTER = [LOCATION.lat, LOCATION.lng];
const DEFAULT_ZOOM = 2;

/**
 * MapEffect
 * @description This is an example of creating an effect used to zoom in and set a popup on load
 */

const MapEffect = ({ markerRef }) => {
  const map = useMap();

  useEffect(() => {
    if (!markerRef.current || !map) return;

    (async function run() {
      const popup = L.popup({
        maxWidth: 800,
      });

      const location = await getCurrentLocation().catch(() => LOCATION);

      const { current: marker } = markerRef || {};

      marker.setLatLng(location);
      popup.setLatLng(location);

      // setTimeout(async () => {
      //   await promiseToFlyTo(map, {
      //     zoom: ZOOM,
      //     center: location,
      //   });

      //   marker.bindPopup(popup);

      //   setTimeout(() => marker.openPopup(), timeToOpenPopupAfterZoom);
      //   setTimeout(
      //     () => marker.setPopupContent(popupContentGatsby),
      //     timeToUpdatePopupAfterZoom
      //   );
      // }, timeToZoom);

      let response;

      try {
        response = await axios.get("https://disease.sh/v3/covid-19/countries");
      } catch (e) {
        console.log(`Failed to fetch countries: ${e.message}`, e);
        return;
      }

      const { data = [] } = response;
      console.log("Data: ", data);

      const hasData = Array.isArray(data) && data.length > 0;

      if (!hasData) return;

      const geoJson = {
        type: "FeatureCollection",
        features: data.map((country = {}) => {
          const { countryInfo = {} } = country;
          const { lat, long: lng } = countryInfo;
          return {
            type: "Feature",
            properties: {
              ...country,
            },
            geometry: {
              type: "Point",
              coordinates: [lng, lat],
            },
          };
        }),
      };

      console.log(geoJson);

      const geoJsonLayers = new L.GeoJSON(geoJson, {
        pointToLayer: (feature = {}, latlng) => {
          const { properties = {} } = feature;
          let updatedFormatted;
          let casesString;

          const { country, updated, cases, deaths, recovered } = properties;

          casesString = `${cases}`;

          if (cases > 1000) {
            casesString = `${casesString.slice(0, -3)}k+`;
          }

          if (updated) {
            updatedFormatted = new Date(updated).toLocaleString();
          }

          const html = `
            <span class="icon-marker">
              <span class="icon-marker-tooltip">
                <h2>${country}</h2>
                <ul>
                  <li><strong>Confirmed:</strong> ${cases}</li>
                  <li><strong>Deaths:</strong> ${deaths}</li>
                  <li><strong>Recovered:</strong> ${recovered}</li>
                  <li><strong>Last Update:</strong> ${updatedFormatted}</li>
                </ul>
              </span>
              ${casesString}
            </span>
          `;

          return L.marker(latlng, {
            icon: L.divIcon({
              className: "icon",
              html,
            }),
            riseOnHover: true,
          });
        },
      });

      geoJsonLayers.addTo(map);
    })();
  }, [map, markerRef]);

  return null;
};

MapEffect.propTypes = {
  markerRef: PropTypes.object,
};

const IndexPage = () => {
  const markerRef = useRef();

  const [stats, getStats] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get("https://disease.sh/v3/covid-19/all")
      .then((res) => getStats(res.data))
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  const mapSettings = {
    center: CENTER,
    defaultBaseMap: "OpenStreetMap",
    zoom: DEFAULT_ZOOM,
  };

  return (
    <Layout pageName="home">
      <Helmet>
        <title>Home Page</title>
      </Helmet>

      <Map {...mapSettings}>
        <MapEffect markerRef={markerRef} />
        <Marker ref={markerRef} position={CENTER} />
      </Map>

      <Container type="content" className="text-center home-start">
        {error && <p className="text-danger">{error}</p>}

        <div className="tracker-stats">
          <p className="tracker-stat-primary">
            {stats ? stats?.tests : "-"}
            <strong> Total Tests</strong>
          </p>
          <p className="tracker-stat-secondary">
            {stats ? stats?.testsPerOneMillion : "-"}
            <strong> Per 1 Million</strong>
          </p>
          <p className="tracker-stat-primary">
            {stats ? stats?.cases : "-"}
            <strong> Total Cases</strong>
          </p>
          <p className="tracker-stat-secondary">
            {stats ? stats?.casesPerOneMillion : "-"}
            <strong> Per 1 Million</strong>
          </p>
          <p className="tracker-stat-primary">
            {stats ? stats?.deaths : "-"}
            <strong> Total Deaths</strong>
          </p>
          <p className="tracker-stat-secondary">
            {stats ? stats?.deathsPerOneMillion : "-"}
            <strong> Per 1 Million</strong>
          </p>
          <p className="tracker-stat-primary">
            {stats ? stats?.active : "-"}
            <strong> Active</strong>
          </p>
          <p className="tracker-stat-primary">
            {stats ? stats?.critical : "-"}
            <strong> Critical</strong>
          </p>
          <p className="tracker-stat-primary">
            {stats ? stats?.recovered : "-"}
            <strong> Recovered</strong>
          </p>
        </div>
      </Container>
    </Layout>
  );
};

export default IndexPage;
