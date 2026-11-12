"""Transforme les avis TED bruts (raw/) en donnees compactes pour le tableau de bord.
Sortie : data.js (window.DATA = {...}) charge par index.html.

Le fichier membres est SIMULE : un echantillon aleatoire (graine fixe) de gagnants
belges a numero BCE valide. Ce ne sont pas de vrais membres d une federation ; l'objectif est
de montrer le croisement avec un fichier membres reel.
"""
import collections
import json
import pathlib
import random
import re
from datetime import date

ICI = pathlib.Path(__file__).parent
RAW = ICI / "raw"

# Correspondance (hypothese de demo) familles CPV -> sous-secteurs d une federation technologique.
SECTEURS = {
    "48": "Software & digitale diensten", "72": "Software & digitale diensten",
    "30": "ICT-hardware & telecom", "32": "ICT-hardware & telecom",
    "31": "Elektrotechniek & energie",
    "38": "Meet- & labotechnologie",
    "42": "Machinebouw",
    "50": "Onderhoud & installatie", "51": "Onderhoud & installatie",
}
TAILLE_KMO = {"sme", "small", "micro", "medium"}
NB_MEMBRES = 80


def langue(d, ordre=("nld", "fra", "eng", "deu")):
    """Choisit une langue dans un champ multilingue TED (dict langue -> valeur)."""
    if not isinstance(d, dict) or not d:
        return d
    for l in ordre:
        if l in d:
            return d[l]
    return next(iter(d.values()))


def titre(n):
    t = langue(n.get("notice-title", {})) or ""
    parts = t.split(" – ", 2)  # "Belgie – <libelle CPV> – <titre reel>"
    return parts[2] if len(parts) == 3 else t


def bce(identifiant):
    """Renvoie le numero BCE a 10 chiffres s'il est valide (cle modulo 97), sinon None."""
    if not identifiant:
        return None
    brut = identifiant.split("_")[0].upper().replace("BE", "", 1)
    chiffres = re.sub(r"[\s.\-]", "", brut)
    if not chiffres.isdigit():
        return None
    if len(chiffres) == 9:
        chiffres = "0" + chiffres
    if len(chiffres) != 10 or chiffres[0] not in "01":
        return None
    base, cle = int(chiffres[:8]), int(chiffres[8:])
    return chiffres if 97 - base % 97 == cle else None


def secteur(n):
    cpv = (n.get("main-classification-lot") or n.get("classification-cpv") or [""])[0]
    return SECTEURS.get(cpv[:2]), cpv


def nb_offres(n):
    codes = n.get("received-submissions-type-code", [])
    vals = n.get("received-submissions-type-val", [])
    if codes and len(codes) == len(vals):
        offres = [int(v) for c, v in zip(codes, vals) if c == "tenders" and str(v).isdigit()]
    elif not codes:
        offres = [int(v) for v in vals if str(v).isdigit()]
    else:
        offres = []
    offres = [o for o in offres if 0 < o <= 100]  # ecarte les erreurs de saisie (ex. 20 154 offres)
    return round(sum(offres) / len(offres), 1) if offres else None


def valeur(n):
    if isinstance(n.get("total-value"), (int, float)) and "EUR" in n.get("total-value-cur", ["EUR"]):
        return float(n["total-value"])
    lots = [v for v in n.get("result-value-lot", []) if isinstance(v, (int, float))]
    return float(sum(lots)) if lots else None


def acheteur(n):
    nom = langue(n.get("buyer-name", {}))
    nom = nom[0] if isinstance(nom, list) and nom else (nom or "Onbekend")
    ids = n.get("organisation-identifier-buyer", [])
    cle = bce(ids[0]) if ids else None
    return (cle or nom.strip().lower()), nom.strip()


def gagnants(n):
    noms = langue(n.get("winner-name", {})) or []
    ids = n.get("winner-identifier", [])
    tailles = n.get("winner-size", [])
    res, vus = [], set()
    for i, nom in enumerate(noms):
        ident = ids[i] if i < len(ids) and len(ids) == len(noms) else None
        num = bce(ident)
        taille = tailles[i] if len(tailles) == len(noms) else None
        cle = num or nom.strip().lower()
        if cle in vus:
            continue
        vus.add(cle)
        res.append({"nom": nom.strip(), "bce": num, "taille": taille})
    return res


def main():
    awards = json.loads((RAW / "awards.json").read_text(encoding="utf-8"))
    ouverts = json.loads((RAW / "open.json").read_text(encoding="utf-8"))

    noms_acheteurs = {}
    avis = []
    for n in awards:
        sect, cpv = secteur(n)
        if not sect:
            continue
        cle_ach, nom_ach = acheteur(n)
        noms_acheteurs.setdefault(cle_ach, nom_ach)
        crit = set(n.get("award-criterion-type-lot", []))
        avis.append({
            "id": n["publication-number"],
            "date": n["publication-date"][:10],
            "titre": titre(n),
            "ach": cle_ach,
            "sect": sect,
            "cpv": cpv,
            "val": valeur(n),
            "off": nb_offres(n),
            "lots": len(set(n.get("identifier-lot", []))) or 1,
            "prix": bool(crit) and crit <= {"price"},
            "gagn": gagnants(n),
        })

    # Membres simules : gagnants belges a BCE valide, tires au hasard (graine fixe).
    par_bce = collections.defaultdict(lambda: {"nom": None, "taille": collections.Counter(), "cpv": collections.Counter()})
    for a in avis:
        for g in a["gagn"]:
            if g["bce"]:
                m = par_bce[g["bce"]]
                m["nom"] = m["nom"] or g["nom"]
                if g["taille"]:
                    m["taille"][g["taille"]] += 1
                m["cpv"][a["cpv"][:5]] += 1
    rng = random.Random(2026)
    candidats = sorted(par_bce)
    elus = rng.sample(candidats, min(NB_MEMBRES, len(candidats)))
    membres = []
    for num in sorted(elus, key=lambda x: par_bce[x]["nom"].lower()):
        m = par_bce[num]
        membres.append({
            "bce": num,
            "nom": m["nom"],
            "kmo": (m["taille"].most_common(1)[0][0] in TAILLE_KMO) if m["taille"] else None,  # taille declaree le plus souvent
            "cpv5": [c for c, _ in m["cpv"].most_common(6)],
        })

    # Appels ouverts + signaux : membres dont le profil CPV (3 chiffres) recoupe l'appel.
    appels = []
    for n in ouverts:
        sect, cpv = secteur(n)
        if not sect:
            continue
        cle_ach, nom_ach = acheteur(n)
        noms_acheteurs.setdefault(cle_ach, nom_ach)
        cpvs5 = {c[:5] for c in n.get("classification-cpv", []) if c}
        dates = sorted(d[:10] for d in n.get("deadline-receipt-tender-date-lot", []) if d)
        if not dates or dates[0] < date.today().isoformat():
            continue
        est = [v for v in n.get("estimated-value-lot", []) if isinstance(v, (int, float))]
        desc = langue(n.get("description-lot", {})) or []
        desc = desc[0] if isinstance(desc, list) and desc else (desc or "")
        signaux = [m["bce"] for m in membres if cpvs5 & set(m["cpv5"])]
        appels.append({
            "id": n["publication-number"],
            "titre": titre(n),
            "ach": cle_ach,
            "sect": sect,
            "cpv": cpv,
            "limite": dates[0],
            "est": float(sum(est)) if est else None,
            "lots": len(set(n.get("identifier-lot", []))) or 1,
            "desc": desc[:400],
            "signaux": signaux,
        })
    appels.sort(key=lambda x: x["limite"])

    stats_bce = {
        "gagnants": sum(len(a["gagn"]) for a in avis),
        "avec_bce": sum(1 for a in avis for g in a["gagn"] if g["bce"]),
    }
    data = {
        "genere": date.today().isoformat(),
        "source": "TED API v3 (api.ted.europa.eu), avis belges depuis 2024-01-01",
        "acheteurs": noms_acheteurs,
        "avis": avis,
        "membres": membres,
        "appels": appels,
        "stats_bce": stats_bce,
    }
    (ICI / "data.js").write_text(
        "window.DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"{len(avis)} attributions, {len(appels)} appels ouverts, {len(membres)} membres simules, "
          f"{len(noms_acheteurs)} acheteurs ; BCE valide pour {stats_bce['avec_bce']}/{stats_bce['gagnants']} gagnants")


if __name__ == "__main__":
    main()
