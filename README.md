# Tenderradar — démo « couche fédération » pour une fédération sectorielle

Démo statique (aucun serveur) construite sur l'API officielle et gratuite de TED.
Ouvrir `index.html` dans un navigateur.

## Rafraîchir les données

```
python fetch_ted.py   # télécharge les avis belges depuis TED → raw/ (≈ 1 min, pas de clé)
python build_data.py  # prépare data.js pour le tableau de bord
```

## Contenu (onglets, en néerlandais)

| Onglet | Bloc de la note de cadrage | Ce qu'il montre |
|---|---|---|
| Sectorbarometer | 1. Inzichten | Attributions, valeur médiane, nb d'offres, part PME, « prix seul », taux de numéros BCE valides |
| Aanbesteders | 1 + 5. Stem | Score « PME-friendly » par pouvoir adjudicateur (concurrence, PME gagnantes, lots, qualité) |
| Leden | 2. Koppeling | Membres qui gagnent, chez qui, et qui d'autre gagne sur le même marché |
| Signalen | 2 + 3 | Appels ouverts rapprochés du profil CPV de chaque membre ; suggestion de consortium |

## Hypothèses et limites

- **Fichier membres simulé** : 80 gagnants belges tirés au hasard (graine fixe). Ce ne sont pas de vrais membres.
- Sous-secteurs déduits de la CPV principale (correspondance de démo, à revoir avec les experts sectoriels).
- TED couvre seulement les marchés au-dessus des seuils européens et ne montre pas les soumissionnaires perdants.
- Le nombre d'offres au-delà de 100 est écarté (erreurs de saisie dans TED).
- Étape suivante prévue : score de pertinence par Claude, membre par membre (logique de RFP_Automation).
