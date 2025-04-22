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

function loadPlates() {
  return fetch('Datos/Datos/PB2002_plates.json')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .catch(error => {
      console.error('Error cargando placas tectónicas:', error);
      throw error;
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

// 3. Función principal que ejecuta todo el proceso
function initMap() {
  Promise.all([loadCSV(), loadPlates()])
    .then(([earthquakeData, platesData]) => {
      // Procesamiento de datos sísmicos
      const validQuakes = earthquakeData.filter(row => 
        row.Latitude && 
        row.Longitude && 
        !isNaN(parseFloat(row['Earthquake Magnitude'])) || 0
      );
      
      const quakeTrace = {
        type: 'scattergeo',
        mode: 'markers',
        lat: validQuakes.map(row => parseFloat(row.Latitude)),
        lon: validQuakes.map(row => parseFloat(row.Longitude)),
        text: validQuakes.map(row => 
          `${row['Location Name'] || 'Ubicación desconocida'}, ${row.Country || 'País desconocido'}\nMagnitud: ${row['Earthquake Magnitude']}`
        ),
        marker: {
          size: validQuakes.map(row =>  parseFloat(row['Earthquake Magnitude']) * 1.1),
          color: validQuakes.map(row => parseFloat(row['Earthquake Magnitude'])),
          colorscale: 'Inferno',
          cmin: 5,  // Magnitud mínima para mejor visualización
          cmax: 9,  // Magnitud máxima esperada
          colorbar: {
            title: 'Magnitud (escala Mercalli)',
            thickness: 20,
            len: 0.5
          },
          line: {
            width: 0.5,
            color: 'black'
          }
        },
        name: 'Terremotos',
        hoverinfo: 'text',
        hoverlabel: {
          bgcolor: 'rgba(0,0,0,0.8)',
          font: {
            color: 'white',
            family: 'Arial',
            size: 12
          }
        }
      };

      // Procesamiento de placas tectónicas
      const plateTraces = [];
      platesData.features.forEach(feature => {
        const { geometry, properties } = feature;
        let polygons = [];

        if (geometry.type === 'Polygon') {
          polygons.push(geometry.coordinates[0]); // Anillo exterior
        } else if (geometry.type === 'MultiPolygon') {
          geometry.coordinates.forEach(polygon => {
            polygons.push(polygon[0]); // Primer anillo de cada polígono
          });
        }

        // Crear trazas para los bordes de las placas
        polygons.forEach(ring => {
          const lons = ring.map(coord => coord[0]);
          const lats = ring.map(coord => coord[1]);
          
          plateTraces.push({
            type: 'scattergeo',
            mode: 'lines',
            lon: lons,
            lat: lats,
            line: {
              width: 1.2,
              color: 'rgba(0, 100, 255, 0.7)'
            },
            hoverinfo: 'none',
            showlegend: false
          });
        });

        // Añadir etiquetas de nombres de placas
        const allCoords = polygons.flat();
        if (allCoords.length > 10) {  // Solo para placas con suficiente tamaño
          const [centroidLon, centroidLat] = computeCentroid(allCoords);
          
          plateTraces.push({
            type: 'scattergeo',
            mode: 'text',
            lon: [centroidLon],
            lat: [centroidLat],
            text: [properties.PlateName],
            textfont: {
              size: 10,
              color: 'rgba(0, 80, 200, 0.9)',
              family: 'Arial, sans-serif'
            },
            hoverinfo: 'none',
            showlegend: false
          });
        }
      });

      // Configuración del layout del mapa
      const layout = {
        title: {
          text: 'Terremotos y Tsunamis con Placas Tectónicas',
          font: {
            size: 18,
            family: 'Arial, sans-serif'
          }
        },
        geo: {
          scope: 'world',
          projection: {
            type: 'natural earth',
            rotation: { lon: -20 }  // Centrar mejor el mapa
          },
          showland: true,
          landcolor: 'rgb(230, 230, 230)',
          showocean: true,
          oceancolor: 'rgb(212, 236, 250)',
          showcountries: true,
          countrycolor: 'rgb(200, 200, 200)',
          showcoastlines: true,
          coastlinecolor: 'rgb(150, 150, 150)',
          showlakes: true,
          lakecolor: 'rgb(212, 236, 250)',
          showframe: false,
          framecolor: '#000',
          bgcolor: 'rgba(240, 240, 240, 0.5)'
        },
        margin: {
          l: 0, r: 0, b: 0, t: 40
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        legend: {
          orientation: 'h',
          x: 0.5,
          y: -0.1,
          xanchor: 'center'
        }
      };

      // Crear el gráfico
      Plotly.newPlot(
        'plot', 
        [...plateTraces, quakeTrace], 
        layout, 
        {
          responsive: false,
          staticPlot: true  // Permitir interactividad
        }
      );
    })
    .catch(error => {
      console.error('Error inicializando el mapa:', error);
      document.getElementById('plot').innerHTML = `
        <div style="color: red; padding: 20px; text-align: center;">
          <h3>Error al cargar los datos</h3>
          <p>${error.message}</p>
          <p>Por favor verifica la consola para más detalles.</p>
        </div>
      `;
    });
}

// 4. Iniciar la aplicación cuando el DOM esté listo
if (document.readyState !== 'loading') {
  initMap();
} else {
  document.addEventListener('DOMContentLoaded', initMap);
}