# Light Pollution Dataset

The app can include artificial light pollution in its stargazing score when the
GFZ KMZ version of the Falchi et al. 2016 World Atlas is available locally.

Download:

- https://datapub.gfz.de/download/10.5880.GFZ.1.4.2016.001/NewWorldAtlas_ArtificialSkyBrightness.kmz

Expected local file:

```txt
data/light-pollution/NewWorldAtlas_ArtificialSkyBrightness.kmz
```

The KMZ is ignored by git because it is a large binary data artifact. The app
loads `doc.kml`, finds the `GroundOverlay` tile for the selected latitude and
longitude, samples the tile color, and maps that color to an estimated Bortle
class/SQM value.

This is appropriate for planning-level Bortle guidance. If you need higher
precision numeric sky-brightness values later, use the raw GeoTIFF source and
preprocess it into a numeric grid instead of sampling rendered KMZ colors.
