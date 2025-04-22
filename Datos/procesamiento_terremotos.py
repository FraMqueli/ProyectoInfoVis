import pandas as pd

# Cargar el archivo CSV
archivo_csv = "./Datos/seismic_data.csv"
df = pd.read_csv(archivo_csv)

# Ordenar por magnitud}
df = df.sort_values(by='Magnitude', ascending=False)

# Guardar solo los primeros 5 registros
df = df.head(5)

# Ordenar por fecha
df = df.sort_values(by='Date', ascending=True)

# Guardar nuevo archivo CSV en la misma carpeta
df.to_csv("./Datos/seismic_data_ordenado.csv", index=False)