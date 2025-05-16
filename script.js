/* ==========================================================
   Rutas
   ========================================================== */
const CSV_PATH   = 'Datos/tsunamis_filtrados.csv';
const AUDIO_PATH = 'audio/audio.mp3';       
const BASE_VOL   = 0.3;                    // volumen mínimo

/* ==========================================================
   Arranque – espera a que el DOM exista
   ========================================================== */
window.addEventListener('DOMContentLoaded', () => {
  let tsunamiSound = null;
  try {
    tsunamiSound        = new Audio(AUDIO_PATH);
    tsunamiSound.volume = BASE_VOL;
  } catch(e) {
    console.warn('Audio no disponible:', e);
  }

  fetch(CSV_PATH)
    .then(resp => {
      if (!resp.ok) throw new Error(`HTTP ${resp.status} al leer CSV`);
      return resp.text();
    })
    .then(txt => Papa.parse(txt, { header: true, dynamicTyping: true }).data)
    .then(rows => dibujarGraficos(limpiar(rows), tsunamiSound))
    .catch(err => console.error('Error de carga:', err));
});

/* ==========================================================
   Limpieza de datos
   ========================================================== */
function limpiar(rows) {
  return rows
    .filter(r => r.Latitude && r.Longitude && r['Maximum Water Height (m)'])
    .map(r => ({
      lat:    +r.Latitude,
      lon:    +r.Longitude,
      height: +r['Maximum Water Height (m)'],
      deaths: +r['Total Deaths']              || 0,
      cost:   +r['Total Damages ($millions)'] || 0,
      name:   r['Location Name'] || 'Sin nombre',
      year:   +r.Year || null
    }));
}

/* ==========================================================
   Dibuja mapa y scatter de Muertes vs Altura
   ========================================================== */
function dibujarGraficos(eventos, sound) {
  if (!eventos.length) {
    console.warn('Sin datos válidos.');
    return;
  }

  const heights = eventos.map(e => e.height);
  const maxH    = Math.max(...heights);

  // --------------------------------------------------------
  // 1) Mapa interactivo (scattergeo)
  // --------------------------------------------------------
  const top3       = [...eventos].sort((a,b) => b.height - a.height).slice(0,3);
  const topHeights = top3.map(e => e.height);

  const colores = eventos.map(e => {
    if (e.height === topHeights[0]) return 'rgb(255,0,0)';
    if (e.height === topHeights[1]) return 'rgb(255,165,0)';
    if (e.height === topHeights[2]) return 'rgb(255,255,0)';
    return 'rgba(0,120,200,0.7)';
  });

  const sizes = heights.map(h => 6 + (h / maxH) * 10);
  const hover = eventos.map(e => `
    <b>${e.name}</b> (${e.year ?? 's/f'})<br>
    Altura: ${e.height} m<br>
    Muertes: ${e.deaths}<br>
    Costos: ${e.cost} M USD
  `);

  const traceGeo = {
    type: 'scattergeo',
    mode: 'markers',
    lon: eventos.map(e => e.lon),
    lat: eventos.map(e => e.lat),
    text: hover,
    hoverinfo: 'text',
    marker: {
      size: sizes,
      color: colores,
      line: { width: 0.5, color: 'rgba(0,0,0,0.2)' }
    },
    name: 'Tsunamis'
  };

  const leyenda = topHeights.map((h,i) => ({
    type: 'scattergeo',
    mode: 'markers',
    lon: [0], lat: [0],
    marker: { size: 8, color: ['rgb(255,0,0)','rgb(255,165,0)','rgb(255,255,0)'][i], opacity: 0 },
    name: ['Mayor tsunami','Segundo mayor','Tercer mayor'][i] + `: ${h} m`,
    hoverinfo: 'skip'
  })).concat({
    type: 'scattergeo',
    mode: 'markers',
    lon: [0], lat: [0],
    marker: { size: 8, color: 'rgba(0,120,200,0.7)', opacity: 0 },
    name: 'Otros tsunamis',
    hoverinfo: 'skip'
  });

  const fondo = '#ffffff';

  const layoutMap = {
    title: 'Tsunamis históricos – Mapa interactivo',
    height: 650,
    margin: { l:0, r:0, t:50, b:0 },
    geo: {
      projection: { type: 'natural earth' },
      showland: true,
      landcolor: fondo,
      showocean: true,
      oceancolor: fondo,
      showcoastlines: true,
      coastlinecolor: 'rgba(0,0,0,0.2)',
      showcountries: false,
      showframe: true,
      framecolor: 'rgba(0,0,0,0.3)',
      framewidth: 1
    },
    legend: {
      title: { text: 'Clasificación' },
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: 'rgba(0,0,0,0.2)', borderwidth: 1
    },
    paper_bgcolor: fondo,
    plot_bgcolor: fondo,
    dragmode: 'zoom'
  };

  Plotly.newPlot('mapa', [traceGeo, ...leyenda], layoutMap, { responsive: true });

  // Ajustamos volumen según altura y reproducimos al hover
  if (sound) {
    const mapaDiv = document.getElementById('mapa');
    mapaDiv.on('plotly_hover', evt => {
      const idx = evt.points[0].pointIndex;
      const volume = Math.min(1, heights[idx] / maxH);
      sound.volume = Math.max(BASE_VOL, volume);
      sound.currentTime = 0;
      sound.play().catch(()=>{});
    });
    mapaDiv.on('plotly_unhover', () => sound.pause());
  }

  // --------------------------------------------------------
  // 2) Scatter Altura vs Muertes + línea de tendencia
  // --------------------------------------------------------
  // Filtra eventos con muertes > 0 para el scatter logarítmico
  const eventosLog = eventos.filter(e => e.deaths > 0);

  const yValues = eventosLog.map(e => e.height);
  const xValues = eventosLog.map(e => e.deaths);

  // Usar log10 para la regresión
  const logX = xValues.map(x => Math.log10(x));
  const { slope, intercept } = regresion(logX, yValues);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const trendLinePoints = 50;
  const trendLineX = [];
  const trendLineY = [];
  for (let i = 0; i < trendLinePoints; i++) {
    // Espaciado logarítmico
    const logx = Math.log10(minX) + (Math.log10(maxX) - Math.log10(minX)) * (i / (trendLinePoints - 1));
    const x = Math.pow(10, logx);
    trendLineX.push(x);
    trendLineY.push(slope * logx + intercept);
  }

  const scatterHM = {
    type: 'scatter',
    mode: 'markers',
    x: xValues,
    y: yValues,
    marker: {
      size: 10,
      color: 'rgba(30,136,229,0.7)',
      line: { width: 1, color: '#fff' }
    },
    name: 'Tsunamis'
  };

  const trendLine = {
    type: 'scatter',
    mode: 'lines',
    x: trendLineX,
    y: trendLineY,
    line: { width: 3, dash: 'dash', color: 'rgba(244,67,54,0.7)' },
    name: 'Tendencia'
  };

  const layoutHM = {
  title: {
    text: 'Correlación entre Número de Muertes y Altura de Ola',
    font: { size: 28 }
  },
  yaxis: { title: 'Altura de Ola (metros)', titlefont: { size: 18 } },
  xaxis: {
    title: 'Número de Muertes (escala logarítmica)',
    type: 'log',
    titlefont: { size: 18 },
    tickvals: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000],
    ticktext: ['1', '2', '5', '10', '20', '50', '100', '200', '500', '1 000', '2 000', '5 000', '10 000', '20 000', '50 000', '100 000', '200 000', '500 000']
  },
  height: 500,
  margin: { t:70, l:70, r:30, b:70 },
  paper_bgcolor: '#f9f9f9',
  plot_bgcolor: '#f9f9f9',
  legend: {
    orientation: 'h',
    y: -0.2,
    x: 0.5,
    xanchor: 'center',
    font: { size: 16 }
  }
};

  Plotly.newPlot('tendencia', [scatterHM, trendLine], layoutHM, { responsive: true });
  }

/* ==========================================================
   Regresión lineal simple: y = slope * x + intercept
   ========================================================== */
function regresion(x, y) {
  const n     = x.length;
  const sumX  = x.reduce((a, b) => a + b, 0);
  const sumY  = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
  const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);

  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}
