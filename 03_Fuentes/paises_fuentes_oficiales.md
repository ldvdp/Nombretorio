# Fuentes oficiales por pais

Este documento resume la base editorial de la seccion `Por paises` de Nombretorio.

## Criterio

La prioridad es usar:

- organismos oficiales de estadistica
- portales nacionales de datos abiertos
- fuentes locales ya descargadas dentro del proyecto

No se toma como base principal ningun generador aleatorio de nombres.

## Confirmadas

- Espana
  - Organismo: `INE`
  - Referencia: `Apellidos y nombres mas frecuentes`

- Francia
  - Organismo: `INSEE`
  - Apoyo local: [0-prenom.csv](C:\Users\David LF\OneDrive - LIMMAT FILMS SL\Documentos\NombresPapisMamis\0-prenom.csv)
  - Apoyo local secundario: [file_report.csv](C:\Users\David LF\OneDrive - LIMMAT FILMS SL\Documentos\NombresPapisMamis\file_report.csv)
  - Nota: el CSV de patronimicos [1-patronymes.csv](C:\Users\David LF\OneDrive - LIMMAT FILMS SL\Documentos\NombresPapisMamis\1-patronymes.csv) no es prioritario para la web de nombres

- Italia
  - Organismo: `Istat`
  - Via oficial tecnica: `esploradati.istat.it/SDMXWS`
  - Apoyo local: [Convertitore-Query-SEP-1.7.xlsm](C:\Users\David LF\OneDrive - LIMMAT FILMS SL\Documentos\NombresPapisMamis\Convertitore-Query-SEP-1.7.xlsm)
  - Nota: el xlsm es una herramienta de conversion de consultas, no el dataset final

- Union Europea
  - Uso: marco de alcance para `UE-27`

## Pendientes de verificar

- Alemania: `Destatis`
- Austria: `Statistik Austria`
- Belgica: `Statbel`
- Dinamarca: `Statistics Denmark`
- Irlanda: `Central Statistics Office`
- Paises Bajos: `CBS`
- Portugal: `IRN / lista de nombres admitidos` como base onomastica y `INE Portugal` como siguiente capa de frecuencia
- Suecia: `SCB`

## Lo ya integrado en la web

- Tarjetas francesas con apoyo de conteos reales del CSV local
- Tarjetas italianas marcadas como preparadas para futura integracion oficial
- Tarjetas portuguesas ampliadas con base en onomastica portuguesa admitida y repertorio luso clasico
- Bloque visual de `Fuentes oficiales` en la pestana `Por paises`

## Siguiente paso sugerido

- reforzar Italia con una primera seleccion mas amplia basada en la via SDMX
- cerrar Portugal con una capa de frecuencia oficial para pasar de bloque onomastico solido a bloque plenamente verificado
- incorporar Paises Bajos o Alemania como siguiente pais con fuente oficial ya aterrizada
- si hace falta, preparar un JSON separado de `country_sources` para no dejarlo embebido en el HTML
