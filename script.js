// 1. Funciones de carga de datos
function loadCSV() {
  return new Promise((resolve, reject) => {
    Papa.parse('Datos/tsunamis_filtrados.csv', {
      download: true,
      header: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('Errores al parsear CSV:', results.errors);
        }
        resolve(results.data);
      },
      error: (error) => reject(error)
    });
  });
}


// 2. Cálculo de centroides para etiquetas de placas
function computeCentroid(coords) {
  if (!coords || coords.length === 0) return [0, 0];
  
  const [sumX, sumY] = coords.reduce(
    ([ax, ay], [x, y]) => [ax + x, ay + y],
    [0, 0]
  );
  return [sumX / coords.length, sumY / coords.length];
}

// Cambiamos las anotaciones para hacerlas más obvias y siempre visibles
function initMap() {
  loadCSV()
    .then(tsunamiData => {
      // 1. Filtrar y parsear tsunamis con altura válida
      const validTsunamis = tsunamiData
        .filter(row =>
          row.Latitude &&
          row.Longitude &&
          row['Maximum Water Height (m)'] &&
          !isNaN(parseFloat(row['Maximum Water Height (m)']))
        )
        .map(row => ({
          lat:     parseFloat(row.Latitude),
          lon:     parseFloat(row.Longitude),
          height:  parseFloat(row['Maximum Water Height (m)']),
          deaths:  parseInt(row['Total Deaths'], 10) || 0,
          damage:  parseFloat(row['Total Damage ($Mil)']) || 0,
          place:   row['Location Name'] || 'Desconocida',
          country: row.Country || ''
        }));

      // 2. Ordenar y seleccionar top 100 y top 3
      validTsunamis.sort((a, b) => b.height - a.height);
      const top100 = validTsunamis.slice(0, 100);
      const top3   = top100.slice(0, 3);
      const rest97 = top100.slice(3);

      // 3. Trazas de Plotly

      // 3.1 Tsunamis 4°–100° en azul
      const blueTrace = {
        type: 'scattergeo',
        mode: 'markers',
        lat: rest97.map(d => d.lat),
        lon: rest97.map(d => d.lon),
        marker: {
          color: 'blue',
          size: rest97.map(d => Math.max(d.height * 0.2, 5)),
          opacity: 0.7
        },
        hoverinfo: 'text',
        text: rest97.map(d =>
          `${d.place}, ${d.country}<br>` +
          `Altura ola: ${d.height} m`
        ),
        name: 'Tsunamis 4–100'
      };

      // 3.2 Top 3 tsunamis en rojo con detalle
      const redTrace = {
        type: 'scattergeo',
        mode: 'markers+text',  // Añadimos texto directamente a los marcadores
        lat: top3.map(d => d.lat),
        lon: top3.map(d => d.lon),
        marker: {
          color: 'red',
          size: top3.map(d => Math.max(d.height * 0.2, 10)),
          line: { width: 1, color: 'darkred' }
        },
        
        hoverinfo: 'none',
        name: 'Top 3 Tsunamis'
      };

      // 4. Añadimos una traza adicional para los cuadros de información
      const infoBoxes = {
        type: 'scattergeo',
        mode: 'markers+text',
        lat: top3.map(d => d.lat + (d.lat > 0 ? -0.08 : 0.08) + 5),  // Desplazamos un poco en latitud
        lon: top3.map(d => d.lon + (d.lon > 0 ? -0.08 : 0.08) + 5),  // Desplazamos un poco en longitud
        marker: {
          color: 'rgba(0,0,0,0)',  // Marcador invisible
          size: 1
        },
        text: top3.map(d => 
          `<b>${d.place}</b><br>` +
          `Altura: ${d.height} m<br>` +
          `Muertes: ${d.deaths}<br>` +
          `Daños: $${d.damage} M`
        ),
        textposition: 'top center',
        textfont: {
          color: 'black',
          size: 20,
          family: 'Arial, sans-serif'
        },
        textborder: {
          color: 'red',
          width: 2
        },
        textbgcolor: 'rgba(255,255,255,0.95)',
        textpad: 8,
        showlegend: false,
        hoverinfo: 'none'
      };

      // 5. Layout con menos dependencia de annotations
      const layout = {
        title: {
          text: 'Top 100 Tsunamis por Altura de Ola (m)',
          font: { size: 18, family: 'Arial, sans-serif' }
        },
        geo: {
          scope: 'world',
          projection: { type: 'natural earth', rotation: { lon: -20 } },
          showland: true, landcolor: 'rgb(230,230,230)',
          showocean: true, oceancolor: 'rgb(212,236,250)',
          showcountries: true, countrycolor: 'rgb(200,200,200)',
          showcoastlines: true, coastlinecolor: 'rgb(150,150,150)',
          showframe: false,
          bgcolor: 'rgba(240,240,240,0.5)'
        },
        margin: { l: 10, r: 10, t: 50, b: 10 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        legend: { 
          orientation: 'h', 
          x: 0.5, 
          y: 0.02, 
          xanchor: 'center',
          bgcolor: 'rgba(255,255,255,0.8)',
          bordercolor: 'gray',
          borderwidth: 1
        },
        // Añadimos líneas de conexión entre puntos y cuadros
        shapes: top3.map((d, i) => {
          const offsetLat = d.lat > 0 ? -0.08 : 0.08;
          const offsetLon = d.lon > 0 ? -0.08 : 0.08;
          return {
            type: 'line',
            x0: d.lon,
            y0: d.lat,
            x1: d.lon + offsetLon,
            y1: d.lat + offsetLat,
            line: {
              color: 'red',
              width: 2
            },
            xref: 'geo',
            yref: 'geo'
          };
        })
      };

      // 6. Dibujar con todas las trazas
      Plotly.newPlot(
        'plot',
        [blueTrace, redTrace, infoBoxes],
        layout,
        { 
          responsive: true,
          staticPlot: true,        // Mapa estático sin interactividad
          displayModeBar: false
        }
      );
    })
    .catch(error => {
      console.error('Error inicializando el mapa:', error);
      document.getElementById('plot').innerHTML = `
        <div style="color:red;padding:20px;text-align:center;">
          <h3>Error al cargar datos</h3>
          <p>${error.message}</p>
        </div>`;
    });
}
// Iniciar cuando el DOM esté listo
if (document.readyState !== 'loading') {
  initMap();
} else {
  document.addEventListener('DOMContentLoaded', initMap);
}

// Iniciar cuando el DOM esté listo
if (document.readyState !== 'loading') {
  initMap();
} else {
  document.addEventListener('DOMContentLoaded', initMap);
}


// 4. Iniciar la aplicación cuando el DOM esté listo
if (document.readyState !== 'loading') {
  initMap();
} else {
  document.addEventListener('DOMContentLoaded', initMap);
}