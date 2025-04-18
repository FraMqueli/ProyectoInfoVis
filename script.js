window.addEventListener("DOMContentLoaded", function () {
  Plotly.d3.csv("Datos\\tsunamis_filtrados.csv", function (err, rows) {
    if (err) {
      console.error("Error leyendo el CSV:", err);
      return;
    }

    // Filtramos eventos con latitud y longitud válidas
    const eventos = rows.filter(row => row["Latitude"] && row["Longitude"]);

    // Agregar información detallada en los tooltips
    const hoverTexts = eventos.map(row => {
      const altura = row["Maximum Water Height (m)"] 
        ? `${row["Maximum Water Height (m)"]} m` 
        : 'No disponible';
      const causa = row["Cause"] ? row["Cause"] : 'No especificada';
      const daños = row["Damage Description"] ? row["Damage Description"] : 'No registrados';
      
      return `<b>${row["Location Name"]}</b> (${row["Year"]})<br>` +
             `Altura máxima: ${altura}<br>` +
             `Causa: ${causa}<br>` +
             `Daños: ${daños}<br>` +
             `Coordenadas: ${row["Latitude"]}, ${row["Longitude"]}`;
    });

    // Calcular tamaño de marcadores con mejor escala logarítmica
    const sizes = eventos.map(row => {
      if (row["Maximum Water Height (m)"]) {
        const altura = parseFloat(row["Maximum Water Height (m)"]);
        return altura > 0 ? 5 + Math.log(altura) * 3 : 4;
      }
      return 4; // Tamaño predeterminado
    });

    // Configuración de los datos
    const data = [{
      type: 'scattergeo',
      mode: 'markers',
      name: 'Eventos de Tsunami',
      lat: eventos.map(row => row["Latitude"]),
      lon: eventos.map(row => row["Longitude"]),
      text: hoverTexts,
      hoverinfo: 'text',
      marker: {
        size: sizes,
        color: eventos.map(row => parseInt(row["Year"])),
        colorscale: 'Turbo',  // Escala más distinguible para años
        colorbar: {
          title: 'Año del evento',
          titlefont: { size: 14 },
          thickness: 20,
          len: 0.7,
          y: 0.5,
          tickvals: [1700, 1800, 1900, 1950, 2000, 2023],  // Ajusta según tus datos
          ticktext: ['1700', '1800', '1900', '1950', '2000', '2023']
        },
        line: { width: 1, color: 'rgba(0,0,0,0.5)' },
        opacity: 0.75
      }
    }];

    // Configuración del layout con mejoras
    const layout = {
      title: {
        text: 'Distribución Global de Tsunamis Registrados en la Historia',
        font: { size: 24, color: '#333' }
      },
      width: 1200,
      height: 700,
      showlegend: true,
      legend: {
        x: 0.01,
        y: 0.99,
        bgcolor: 'rgba(255,255,255,0.8)',
        bordercolor: '#999',
        borderwidth: 1
      },
      geo: {
        scope: 'world',
        projection: { 
          type: 'orthographic',  // Proyección esférica que muestra mejor distribución global
          rotation: { lon: -145, lat: 20 }  // Centrado en el Pacífico donde hay más tsunamis
        },
        showland: true,
        landcolor: 'rgb(240, 240, 240)',
        showocean: true,
        oceancolor: 'rgb(220, 230, 255)',
        showcoastlines: true,
        coastlinecolor: 'rgb(80, 80, 80)',
        coastlinewidth: 0.5,
        showcountries: true,
        countrycolor: 'rgb(180, 180, 180)',
        countrywidth: 0.5,
        showframe: false
      },
      annotations: [{
        x: 0.01,
        y: 0.01,
        xref: 'paper',
        yref: 'paper',
        text: 'Tamaño del punto indica la altura del tsunami',
        showarrow: false,
        font: { size: 12, color: '#666' }
      }],
      margin: { l: 0, r: 0, t: 50, b: 0 }
    };

    // Configuración adicional para mejor interactividad
    const config = {
      responsive: true,
      scrollZoom: true,
      displayModeBar: true,
      modeBarButtonsToAdd: ['toImage', 'resetGeo'],
      modeBarButtonsToRemove: ['lasso2d', 'select2d']
    };

    // Crear el gráfico con Plotly
    Plotly.newPlot('grafico', data, layout, config);

    // Añadir controles interactivos para filtrar por rango de años
    const añosMin = Math.min(...eventos.map(row => parseInt(row["Year"])));
    const añosMax = Math.max(...eventos.map(row => parseInt(row["Year"])));
    
    const controlDiv = document.createElement('div');
    controlDiv.innerHTML = `
      <div style="padding: 10px; background: #f5f5f5; border-radius: 5px; margin-top: 10px;">
        <h4>Filtrar por año:</h4>
        <div style="display: flex; align-items: center;">
          <span id="yearRangeMin">${añosMin}</span>
          <input type="range" id="yearSliderMin" min="${añosMin}" max="${añosMax}" value="${añosMin}" style="margin: 0 10px; width: 200px;">
          <input type="range" id="yearSliderMax" min="${añosMin}" max="${añosMax}" value="${añosMax}" style="margin: 0 10px; width: 200px;">
          <span id="yearRangeMax">${añosMax}</span>
          <button id="resetFilter" style="margin-left: 20px;">Reiniciar</button>
        </div>
      </div>
    `;
    
    document.getElementById('grafico').parentNode.insertBefore(controlDiv, document.getElementById('grafico').nextSibling);
    
    // Implementar la funcionalidad de filtrado
    function updateYearRange() {
      const minYear = parseInt(document.getElementById('yearSliderMin').value);
      const maxYear = parseInt(document.getElementById('yearSliderMax').value);
      
      document.getElementById('yearRangeMin').textContent = minYear;
      document.getElementById('yearRangeMax').textContent = maxYear;
      
      const filteredEvents = eventos.filter(row => {
        const year = parseInt(row["Year"]);
        return year >= minYear && year <= maxYear;
      });
      
      Plotly.restyle('grafico', {
        lat: [filteredEvents.map(row => row["Latitude"])],
        lon: [filteredEvents.map(row => row["Longitude"])],
        text: [filteredEvents.map(row => {
          // Usar la misma función para generar tooltip que definimos antes
          const altura = row["Maximum Water Height (m)"] 
            ? `${row["Maximum Water Height (m)"]} m` 
            : 'No disponible';
          const causa = row["Cause"] ? row["Cause"] : 'No especificada';
          
          return `<b>${row["Location Name"]}</b> (${row["Year"]})<br>` +
                 `Altura máxima: ${altura}<br>` +
                 `Causa: ${causa}<br>` +
                 `Coordenadas: ${row["Latitude"]}, ${row["Longitude"]}`;
        })],
        'marker.size': [filteredEvents.map(row => {
          if (row["Maximum Water Height (m)"]) {
            const altura = parseFloat(row["Maximum Water Height (m)"]);
            return altura > 0 ? 5 + Math.log(altura) * 3 : 4;
          }
          return 4;
        })],
        'marker.color': [filteredEvents.map(row => parseInt(row["Year"]))]
      });
    }
    
    document.getElementById('yearSliderMin').addEventListener('input', updateYearRange);
    document.getElementById('yearSliderMax').addEventListener('input', updateYearRange);
    document.getElementById('resetFilter').addEventListener('click', function() {
      document.getElementById('yearSliderMin').value = añosMin;
      document.getElementById('yearSliderMax').value = añosMax;
      updateYearRange();
    });
  });
});