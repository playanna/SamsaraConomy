const pillData = [
    {
        name: "Mortal-Grade Pill",
        boost: 0.05,
        maxRealmIndex: 2,
        description: "Muddy elixir that barely muffles thunder.",
        grade: "Mortal",
        maxOwned: 2
    },
    {
        name: "Earth-Grade Pill",
        boost: 0.10,
        maxRealmIndex: 5,
        description: "Infused with mountain essence to stabilize qi.",
        grade: "Earth",
        maxOwned: 4
    },
    {
        name: "Sky-Grade Pill",
        boost: 0.07,
        maxRealmIndex: 8,
        description: "Harvested from 900-year-old stormcloud herbs.",
        grade: "Sky",
        maxOwned: 8
    },
    {
        name: "Celestial-Grade Pill",
        boost: 0.05,
        maxRealmIndex: 11,
        description: "Condensed from a fallen star’s core. Rare!",
        grade: "Celestial",
        maxOwned: 12
    },
    {
        name: "Divine-Grade Pill",
        boost: 0.03,
        maxRealmIndex: Infinity,
        description: "Banned by heavenly decree. Corrupts the soul.",
        grade: "Divine",
        maxOwned: 20
    }
];


function getAvailablePillsForRealm(currentRealm, stageData) {
    const index = stageData.findIndex(s => s.name === currentRealm);
    return pillData.filter(pill => pill.maxRealmIndex >= index);
}



function getMaxPillBoost(currentRealm, stageData) {
    const realmIndex = stageData.findIndex(s => s.name === currentRealm);
    if (realmIndex <= 2) return 0.10; // Mortal-Grade x2
    if (realmIndex <= 5) return 0.10;
    if (realmIndex <= 8) return 0.07;
    if (realmIndex <= 11) return 0.05;
    return 0.03;
}

module.exports = {
    pillData,
    getAvailablePillsForRealm,
    getMaxPillBoost
};
