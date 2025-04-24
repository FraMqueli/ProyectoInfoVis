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

// 2. Definición global de posiciones para etiquetas (fuera de initMap)
const infoPositions = [
  { latOffset: -20, lonOffset: -30 },   // Tsunami 1 - Mover hacia el noreste
  { latOffset: -5, lonOffset: 55 }, // Tsunami 2 - Mover hacia el suroeste
  { latOffset: 20, lonOffset: -5 }   // Tsunami 3 - Mover hacia el sureste
];

// 3. Función para crear el gráfico de correlación
function createCorrelationChart(data, container) {
  const filteredData = data.filter(d => 
    d.height > 0 && d.deaths > 0
  ).sort((a, b) => a.deaths - b.deaths);
  
  const hoverTexts = filteredData.map(d => 
    `<div style="font-family:sans-serif; font-size:13px; padding:5px;">
       <strong>${d.place}</strong>, ${d.country} <em>(${d.year})</em><br>
       <span style="color:#444;">Altura:</span> ${d.height} m<br>
       <span style="color:#444;">Muertes:</span> ${d.deaths.toLocaleString()}
     </div>`
  );
  
  const trace = {
    y: filteredData.map(d => d.height),
    x: filteredData.map(d => d.deaths),
    mode: 'markers',
    type: 'scatter',
    name: 'Tsunamis',
    marker: {
      size: 10,
      color: 'rgba(41, 128, 185, 0.85)',
      opacity: 0.85,
      line: {
        color: 'rgba(25, 79, 115, 1)',
        width: 1
      }
    },
    text: hoverTexts,
    hoverinfo: 'text',
    hoverlabel: {
      bgcolor: 'white',
      bordercolor: '#555',
      font: {size: 13, color: 'black'}
    }
  };
  
  // Cálculo de línea de tendencia
  const xValues = filteredData.map(d => d.deaths);
  const yValues = filteredData.map(d => d.height);
  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((a, b, i) => a + b * yValues[i], 0);
  const sumXX = xValues.reduce((a, b) => a + b * b, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const trendline = {
    x: [Math.min(...xValues), Math.max(...xValues)],
    y: [slope * Math.min(...xValues) + intercept, slope * Math.max(...xValues) + intercept],
    mode: 'lines',
    type: 'scatter',
    name: 'Tendencia',
    line: {
      color: 'rgba(231, 76, 60, 0.7)',
      width: 3,
      dash: 'dash'
    }
  };
  
  const layout = {
    title: {
      text: 'Correlación entre Número de Muertes y Altura de Ola',
      font: {
        family: 'Helvetica, Arial, sans-serif',
        size: 22,
        color: '#333'
      },
      y: 0.95
    },
    xaxis: {
      title: {
        text: 'Número de Muertes (escala logarítmica)',
        font: {
          family: 'Helvetica, Arial, sans-serif',
          size: 16,
          color: '#333'
        }
      },
      type: 'log',
      tickformat: '.0f',
      gridcolor: 'rgba(200, 200, 200, 0.2)',
      zeroline: false
    },
    yaxis: {
      title: {
        text: 'Altura de Ola (metros)',
        font: {
          family: 'Helvetica, Arial, sans-serif',
          size: 16,
          color: '#333'
        }
      },
      tickformat: '.1f',
      gridcolor: 'rgba(200, 200, 200, 0.2)',
      zeroline: false
    },
    hovermode: 'closest',
    legend: {
      orientation: 'h',
      y: -0.2,
      x: 0.5,
      xanchor: 'center',
      font: {
        family: 'Helvetica, Arial, sans-serif',
        size: 14
      },
      bgcolor: 'rgba(255, 255, 255, 0.9)',
      bordercolor: '#DDD',
      borderwidth: 1
    },
    paper_bgcolor: 'rgba(248, 249, 250, 1)',
    plot_bgcolor: 'rgba(248, 249, 250, 1)',
    margin: {
      l: 70,
      r: 40,
      t: 60,
      b: 90
    },
    shapes: [{
      type: 'rect',
      xref: 'paper',
      yref: 'paper',
      x0: 0,
      y0: 0,
      x1: 1,
      y1: 1,
      line: {
        color: '#DDD',
        width: 1
      },
      layer: 'below'
    }]
  };
  
  Plotly.newPlot(container, [trace, trendline], layout, {
    displayModeBar: false,
    staticPlot: true
  });
}

// 4. Función principal para inicializar los mapas
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
          country: row.Country || '',
          year:    parseInt(row.Year, 10) || 0,
          date:    row.Date || 'Desconocida'
        }));

      // 2. Ordenar y seleccionar top 100 y top 3
      validTsunamis.sort((a, b) => b.height - a.height);
      const top100 = validTsunamis.slice(0, 100);
      const top3   = top100.slice(0, 3);
      const rest97 = top100.slice(3);

      // 3. Trazas de Plotly con estética mejorada
      const blueTrace = {
        type: 'scattergeo',
        mode: 'markers',
        lat: rest97.map(d => d.lat),
        lon: rest97.map(d => d.lon),
        marker: {
          color: 'rgba(30, 144, 255, 0.8)',
          size: rest97.map(d => Math.max(d.height * 1.2, 6)),
          opacity: 0.85,
          line: {
            color: 'rgba(0, 90, 190, 0.9)',
            width: 1
          },
          symbol: 'circle'
        },
        hoverinfo: 'text',
        text: rest97.map(d =>
          `<b>${d.place}, ${d.country} (${d.year})</b><br>` +
          `Altura ola: ${d.height} m<br>` +
          `Muertes: ${d.deaths.toLocaleString() || 'N/A'}`
        ),
        name: 'Tsunamis 4–100'
      };

      const redTrace = {
        type: 'scattergeo',
        mode: 'markers',
        lat: top3.map(d => d.lat),
        lon: top3.map(d => d.lon),
        marker: {
          color: 'rgba(220, 20, 60, 0.9)',
          size: top3.map(d => Math.max(d.height * 1.5, 15)),
          line: { 
            width: 2, 
            color: 'rgba(180, 0, 40, 1)' 
          },
          symbol: 'circle'
        },
        hoverinfo: 'text',
        text: top3.map(d =>
          `<b>${d.place}, ${d.country} (${d.year})</b><br>` +
          `Altura ola: ${d.height} m<br>` +
          `Muertes: ${d.deaths.toLocaleString()}<br>` +
          `Daños: $${d.damage.toLocaleString()} M`
        ),
        name: 'Top 3 Tsunamis'
      };

      // 4. Traza para los cuadros de información con nuevos estilos
// 4. Traza para los cuadros de información con formato mejorado
const infoBoxes = {
  type: 'scattergeo',
  mode: 'text+markers',
  lat: top3.map((d, i) => d.lat + infoPositions[i].latOffset),
  lon: top3.map((d, i) => d.lon + infoPositions[i].lonOffset),
  marker: {
    symbol: 'square',
    size: 120, // Tamaño ajustado para mejor distribución del texto
    sizemode: 'diameter',
    sizeref: 2, // Factor de ajuste para el tamaño
    color: 'rgba(255, 255, 255, 0.98)', // Fondo blanco para mejor contraste
    line: {
      color: 'rgba(50, 50, 50, 1)', // Borde oscuro para definir mejor el recuadro
      width: 1
    },
    opacity: 1, // Totalmente opaco
    standoff: 15,
    padding: 25 // Más espacio interno alrededor del texto
  },
  text: top3.map((d, i) => 
    `País: ${d.country}<br>
  Año: ${d.year}<br>
  Altura: ${d.height} m<br>
  Muertes: ${d.deaths.toLocaleString()}<br>
  Daños: $${d.damage.toLocaleString()} M  <br>
      <br>`
  ),
  textposition: 'middle center',
  textfont: {
    color: 'black',
    family: 'Arial, sans-serif',
    size: 12
  },
  hoverinfo: 'none',
  name: '',
  ids: ['tsunami1', 'tsunami2', 'tsunami3']
};
      // 5. Layout con líneas de conexión mejoradas
      const layout = {
        title: {
          text: 'Top 100 Tsunamis por Altura de Ola (metros)',
          font: { 
            size: 24, 
            family: 'Helvetica, Arial, sans-serif',
            color: '#333'
          },
          y: 0.95
        },
        geo: {
          scope: 'world',
          projection: { 
            type: 'natural earth', 
            rotation: { lon: -20 } 
          },
          showland: true, 
          landcolor: 'rgb(240,240,230)',
          showocean: true, 
          oceancolor: 'rgb(210,236,250)',
          showcountries: true, 
          countrycolor: 'rgb(180,180,180)',
          showcoastlines: true, 
          coastlinecolor: 'rgb(150,150,150)',
          showframe: false,
          bgcolor: 'rgba(248, 249, 250, 1)',
          lonaxis: {
            showgrid: true,
            gridcolor: 'rgba(200, 200, 200, 0.2)',
            gridwidth: 0.5
          },
          lataxis: {
            showgrid: true,
            gridcolor: 'rgba(200, 200, 200, 0.2)',
            gridwidth: 0.5
          }
        },
        margin: { l: 10, r: 10, t: 60, b: 10 },
        paper_bgcolor: 'rgba(248, 249, 250, 1)',
        legend: { 
          orientation: 'h', 
          x: 0.5, 
          y: 0.02, 
          xanchor: 'center',
          bgcolor: 'rgba(255,255,255,0.9)',
          bordercolor: '#DDD',
          borderwidth: 1,
          font: {
            family: 'Helvetica, Arial, sans-serif',
            size: 14
          }
        },
        shapes: top3.map((d, i) => ({
          type: 'line',
          x0: d.lon,
          y0: d.lat,
          x1: d.lon + infoPositions[i].lonOffset,
          y1: d.lat + infoPositions[i].latOffset,
          line: {
            color: 'rgba(220, 20, 60, 0.85)',
            width: 3,
            dash: '4px,3px'
          },
          xref: 'geo',
          yref: 'geo'
        })),
        annotations: [
          {
            text: '© Visualización de Datos de Tsunamis, 2025',
            showarrow: false,
            x: 0.01,
            y: 0.01,
            xref: 'paper',
            yref: 'paper',
            font: {
              size: 10,
              color: '#888'
            }
          }
        ]
      };

      // 6. Dibujar mapa principal
      Plotly.newPlot(
        'plot',
        [blueTrace, redTrace, infoBoxes],
        layout,
        { 
          responsive: false,
          staticPlot: true,
          displayModeBar: false
        }
      );

      // 7. Crear contenedor para el gráfico de correlación
      if (!document.getElementById('correlation-chart')) {
        const container = document.createElement('div');
        container.id = 'correlation-chart';
        container.style.width = '100%';
        container.style.height = '450px';
        container.style.marginTop = '30px';
        container.style.marginBottom = '30px';
        container.style.borderTop = '1px solid #DDD';
        container.style.paddingTop = '20px';
        document.getElementById('plot').parentNode.appendChild(container);
      }

      // 8. Crear el gráfico de correlación
      createCorrelationChart(validTsunamis, 'correlation-chart');
      
      // 9. Añadir título global
      const headerContainer = document.createElement('div');
      headerContainer.innerHTML = `
        <div style="text-align:center; margin-bottom:20px; font-family:Helvetica, Arial, sans-serif;">
          <h1 style="color:#333; font-size:30px; margin-bottom:5px;">Análisis Global de Tsunamis</h1>
          <p style="color:#666; font-size:16px; margin-top:0;">Distribución geográfica e impacto de los tsunamis más significativos registrados</p>
        </div>
      `;
      document.getElementById('plot').parentNode.insertBefore(headerContainer, document.getElementById('plot'));
    })
    .catch(error => {
      console.error('Error inicializando el mapa:', error);
      document.getElementById('plot').innerHTML = `
        <div style="color:#D32F2F; padding:30px; text-align:center; font-family:Helvetica, Arial, sans-serif; background-color:#FFEBEE; border:1px solid #FFCDD2; border-radius:4px; margin:20px;">
          <h3 style="margin-bottom:10px;">Error al cargar datos</h3>
          <p style="color:#555;">${error.message}</p>
          <p style="color:#777; font-size:14px; margin-top:15px;">Verifique la conexión y la disponibilidad del archivo CSV.</p>
        </div>`;
    });
}

// Iniciar cuando el DOM esté listo
if (document.readyState !== 'loading') {
  initMap();
} else {
  document.addEventListener('DOMContentLoaded', initMap);
}

// Estilos adicionales
document.addEventListener('DOMContentLoaded', function() {
  const style = document.createElement('style');
  style.textContent = `
    body {
      font-family: Helvetica, Arial, sans-serif;
      background-color: #f8f9fa;
      color: #333;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    #plot, #correlation-chart {
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
      background-color: #fff;
      padding: 10px;
    }
    
    .container {
      padding: 20px;
      background-color: #fff;
      border-radius: 5px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }
    
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #888;
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);
  
  // Agregar pie de página
  const footer = document.createElement('div');
  footer.className = 'footer';
  footer.innerHTML = `
    <p>Visualización de datos de tsunamis | Datos: Base de Datos Mundial de Tsunamis </p>
  `;
  document.body.appendChild(footer);
});