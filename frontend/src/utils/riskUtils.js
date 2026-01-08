// concatène plusieurs classes conditionnelles
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function getDominantRisk(zone) {
  // Trouve le risque le plus élevé parmi fire/flood/ice/storm
  const entries = Object.entries(zone.risks);
  let highest = entries[0][1];
  let type = entries[0][0];

  entries.forEach(([riskType, riskData]) => {
    const levelOrder = { low: 1, medium: 2, high: 3 };

    if (levelOrder[riskData.level] > levelOrder[highest.level]) {
      highest = riskData;
      type = riskType;
    }
  });

  return { ...highest, type };
}

export function getLowestRisk(zone) {
  const entries = Object.entries(zone.risks);
  let lowest = entries[0][1];
  let type = entries[0][0];

  entries.forEach(([riskType, riskData]) => {
    const levelOrder = { low: 1, medium: 2, high: 3 };

    if (levelOrder[riskData.level] < levelOrder[lowest.level]) {
      lowest = riskData;
      type = riskType;
    }
  });

  return { ...lowest, type };
}
