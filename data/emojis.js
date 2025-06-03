const emojis = {
    "tribulation": '<a:Lightning_Blue:1369196545949306982>',
    "heavenlyorbs": '<:heavenlyorbs:776075202849013770>',
    "spiritstone": '<:karmicstone:757981408143868034>',
}

/**
 * Creates and returns a map of categorized emojis for various items such as souls, artifacts, materials, and alchemy.
 * Each category contains different rarity levels with corresponding emoji representations.
 */
function createEmojiMaps() {
  return {
    souls: {
      common: '<a:flamewhite:776074845435723807>',
      uncommon: '<a:flamegreenspirit:1361606153494073445>',
      rare: '<a:flameice:1361606119906344996>',
      epic: '<a:flamelotusdevil:1361606130119348366>',
      legendary: '<a:flamelotus:1361606112398282963>',
      mythic: '<a:flamedevil:1361606145566838836>'
    },
    artifacts: {
      common: '<a:ArtifactCommon:1369300270298959903>',
      uncommon: '<a:ArtifactUncommon:1369302829378043924>',
      rare: '<a:ArtifactRare:1369300782385463378>',
      epic: '<a:ArtifactEpic:1369300476092354622>',
      legendary: '<a:ArtifactLegendary:1369300643960983612>',
      mythic: '<a:ArtifactMythic:1369302893173149807>'
    },
    materials: {
      common: '<:Jade_GemWhite:1369296652669681664>',
      uncommon: '<:Jade_Gem:1369293472728748052>',
      rare: '<:Jade_GemBlue:1369296332313067631>',
      epic: '<:Jade_GemRed:1369296429037649940>',
      legendary: '<:Jade_Gemeyellow:1369297563311669258>',
      mythic: '<:Jade_GemeDev:1369296949835993098>'
    },
    alchemy: {
      common: '<:9615saltyherbamystica:1369291481231392838>',
      uncommon: '<:4318bitterherbamystica:1369291403925913671>',
      rare: '<:9615salty:1369292348143435776>',
      epic: '<:2105sweetherbamystica:1369291290239303700>',
      legendary: '<:4318sourherbamystica:1369291457856278770>',
      mythic: '<:2163spicyherbamystica:1369291360347095050>'
    }
  };
}

module.exports = { emojis, createEmojiMaps };