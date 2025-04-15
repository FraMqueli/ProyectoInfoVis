import pandas as pd

# Cargar el archivo CSV 
archivo_csv = "tsunamis-2023-09-11_22-13-51_ 0530 (2).csv"
df = pd.read_csv(archivo_csv)

# Reemplazar "Nan" en los nombres de las columnas
df.columns = df.columns.str.replace("Nan", " ", regex=False)

# Reemplazar "Nan" en los valores del DataFrame
df = df.replace(r"Nan", " ", regex=True)

# Seleccionar las columnas que deseas mantener
columnas_interes = ['Sr.no', 'Year', 'Mo', 'Earthquake Magnitude', 'Country', 'Location Name', 'Latitude', 'Longitude', 'Maximum Water Height (m)']
df_filtrado = df[columnas_interes]

# Eliminar columnas completamente vacías (si las hay)
df_filtrado = df_filtrado.dropna(how='all', axis=1)

# Guardar el nuevo archivo CSV con las columnas seleccionadas
df_filtrado.to_csv("tsunamis_filtrados.csv", index=False)

print("Archivo procesado y guardado como 'tsunamis_filtrados.csv'")