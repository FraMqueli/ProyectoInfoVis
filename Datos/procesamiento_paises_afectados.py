import pandas as pd

# Cargar el archivo de tsunamis
tsunamis = pd.read_csv("./Datos/tsunamis_filtrados.csv")

# Filtrar tsunamis que tienen valores nulos en Year
tsunamis = tsunamis.dropna(subset=["Year"])

# Convertir la columna Year a entero para facilitar el filtrado
tsunamis["Year"] = tsunamis["Year"].astype(int)

# Lista de países que podrían ser afectados por terremotos en Chile
paises_afectados = [
    "CHILE", "PERU", "ECUADOR", "COLOMBIA", "PANAMA", "COSTA RICA", "MEXICO", "USA",
    "JAPAN", "PHILIPPINES", "NEW ZEALAND", "AUSTRALIA", "INDONESIA", "RUSSIA", "CANADA",
    "FIJI", "SAMOA", "TONGA", "HAWAII", "PAPUA NEW GUINEA", "SOLOMON ISLANDS"
]

# Normalizar los nombres de los países en el DataFrame de tsunamis a mayúsculas
tsunamis["Country"] = tsunamis["Country"].str.upper()

# Filtrar los tsunamis que ocurrieron entre 2014 y 2016 y en los países afectados
tsunamis_filtrados = tsunamis[
    (tsunamis["Year"] >= 2014) & 
    (tsunamis["Year"] <= 2016) & 
    (tsunamis["Country"].isin(paises_afectados))
]

# Guardar los resultados en un nuevo archivo CSV
tsunamis_filtrados.to_csv("./Datos/tsunamis_filtrados_2014_2016_afectados.csv", index=False)
