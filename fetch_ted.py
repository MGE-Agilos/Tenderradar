"""Telecharge depuis l'API officielle TED (gratuite, sans cle) les avis belges
utiles a la demo :
  - attributions (can-standard) depuis le 1er janvier 2024 ;
  - appels ouverts (cn-standard) dont la date limite n'est pas passee.
Perimetre : familles CPV proches des secteurs d une federation technologique (voir CPV_FAMILLES).
Sortie : raw/awards.json et raw/open.json (avis bruts, sans les liens).
"""
import json
import pathlib
import sys
import time
import urllib.request
from datetime import date

API = "https://api.ted.europa.eu/v3/notices/search"
CPV_FAMILLES = ["30", "31", "32", "38", "42", "48", "50", "51", "72"]
CPV_QUERY = "classification-cpv IN (" + " ".join(f + "*" for f in CPV_FAMILLES) + ")"

CHAMPS_COMMUNS = [
    "publication-number", "publication-date", "notice-title", "buyer-name",
    "organisation-identifier-buyer", "main-classification-lot", "classification-cpv",
    "identifier-lot", "award-criterion-type-lot",
]
CHAMPS_ATTRIBUTION = CHAMPS_COMMUNS + [
    "winner-name", "winner-identifier", "winner-size",
    "received-submissions-type-code", "received-submissions-type-val",
    "total-value", "total-value-cur", "result-value-lot", "result-value-cur-lot",
]
CHAMPS_OUVERT = CHAMPS_COMMUNS + [
    "deadline-receipt-tender-date-lot", "estimated-value-lot", "estimated-value-cur-lot",
    "description-lot",
]

RAW = pathlib.Path(__file__).parent / "raw"


def chercher(query, champs, limite=250):
    avis, page = [], 1
    while True:
        corps = json.dumps({"query": query, "fields": champs, "limit": limite, "page": page}).encode()
        req = urllib.request.Request(API, data=corps, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=60) as r:
            d = json.load(r)
        lot = d.get("notices", [])
        for n in lot:
            n.pop("links", None)
        avis.extend(lot)
        total = d.get("totalNoticeCount", 0)
        print(f"  page {page}: {len(avis)}/{total}", file=sys.stderr)
        if not lot or len(avis) >= total:
            return avis
        page += 1
        time.sleep(0.5)


def main():
    RAW.mkdir(exist_ok=True)
    aujourdhui = date.today().strftime("%Y%m%d")
    print("Attributions...", file=sys.stderr)
    awards = chercher(
        f"buyer-country=BEL AND notice-type=can-standard AND {CPV_QUERY} AND publication-date>=20240101",
        CHAMPS_ATTRIBUTION,
    )
    (RAW / "awards.json").write_text(json.dumps(awards, ensure_ascii=False), encoding="utf-8")
    print("Appels ouverts...", file=sys.stderr)
    ouverts = chercher(
        f"buyer-country=BEL AND notice-type=cn-standard AND {CPV_QUERY} "
        f"AND deadline-receipt-tender-date-lot>={aujourdhui}",
        CHAMPS_OUVERT,
    )
    (RAW / "open.json").write_text(json.dumps(ouverts, ensure_ascii=False), encoding="utf-8")
    print(f"OK : {len(awards)} attributions, {len(ouverts)} appels ouverts", file=sys.stderr)


if __name__ == "__main__":
    main()
