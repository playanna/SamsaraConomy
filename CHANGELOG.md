# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Combat System Stability**: Resolved critical "Unknown interaction" errors (DiscordAPIError[10062]) that occurred when Discord interactions expired during combat sessions
- **Interaction Expiry Handling**: Implemented comprehensive fallback mechanisms for expired interactions across all combat components
- **Combat Session Persistence**: Enhanced combat state preservation to prevent progress loss when UI interactions expire
- **Error Recovery**: Added graceful degradation that maintains combat functionality even when Discord interaction limits are exceeded

### Changed
- **Enhanced `sendReply` function**: Improved error handling with intelligent fallback to channel messages when interactions expire
- **Combat UI Resilience**: Modified combat message updates to handle expired interactions gracefully
- **Button Handler Robustness**: Strengthened button interaction handling with comprehensive try-catch blocks and specific Discord API error handling
- **Interaction Validation**: Added proactive expiry checks before attempting to use Discord interactions

### Technical Details
- Modified `utils/workhelpers/handlers/combatUtils.js`:
  - Enhanced `sendReply()` with expired interaction detection and channel fallback
  - Improved `endCombat()` with pre-send interaction validation
  - Strengthened `isInteractionExpired()` with null checks and error handling
- Updated `utils/workhelpers/handlers/combatProcessor.js`:
  - Enhanced `processCombatAction()` to continue processing with expired interactions
  - Improved `processTechniqueUsage()` with conditional UI updates
- Strengthened `Slashcommands/work/fightstart.js`:
  - Added comprehensive error handling in `handleButton()` function
  - Implemented specific handling for Discord API error code 10062

### Impact
- Combat sessions no longer crash due to interaction expiry
- Users receive clear feedback about expired sessions via channel messages
- Combat results are preserved and delivered even when interactions fail
- Improved overall system stability and user experience
- Reduced support requests related to lost combat progress

---

## Previous Releases

*This changelog was started with the interaction expiry fixes. Previous changes were not documented in this format.*
