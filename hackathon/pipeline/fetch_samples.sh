#!/usr/bin/env bash
# Rebuilds the sample villages shipped with the dashboard. Each takes about a minute.
set -e
cd "$(dirname "$0")"
OUT=../app/data
python3 gridsight_fetch.py --name "Gbamu Gbamu" --country NG --region "Ogun State, Nigeria" --lat 6.8451 --lon 4.2149 --out $OUT/gbamu-gbamu.json
python3 gridsight_fetch.py --name "Talek" --country KE --region "Narok County, Kenya" --lat -1.4422 --lon 35.2160 --out $OUT/talek.json
python3 gridsight_fetch.py --name "Kitobo" --country UG --region "Kalangala, Uganda (Lake Victoria island)" --lat -0.2624 --lon 32.4297 --out $OUT/kitobo.json
python3 gridsight_fetch.py --name "Bulongwa" --country TZ --region "Njombe Region, Tanzania" --lat -9.3310 --lon 34.0580 --out $OUT/bulongwa.json
python3 gridsight_fetch.py --name "Kychom" --country SL --region "Kambia District, Sierra Leone" --lat 8.9287 --lon -13.1417 --out $OUT/kychom.json
