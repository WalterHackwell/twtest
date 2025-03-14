/*
 * Script Name: Friend Request
 * Version: v1.0.5
 * Last Updated: 2025-03-14
 * Author: RedAlert
 * Author URL: https://twscripts.dev/
 * Author Contact: redalert_tw (Discord)
 * Approved: N/A
 * Approved Date: 2021-09-20
 * Mod: JawJaw
 * Modified by: User (Auto-click functionality)
 */

/*--------------------------------------------------------------------------------------
 * This script can NOT be cloned and modified without permission from the script author.
 --------------------------------------------------------------------------------------*/

// User Input
if (typeof DEBUG !== 'boolean') DEBUG = false;

// Script Config
var scriptConfig = {
    scriptData: {
        prefix: 'friendRequest',
        name: 'Friend Request',
        version: 'v1.0.5',
        author: 'RedAlert',
        authorUrl: 'https://twscripts.dev/',
        helpLink:
            'https://forum.tribalwars.net/index.php?threads/friend-request.287581/',
    },
    translations: {
        en_DK: {
            'Friend Request': 'Friend Request',
            Help: 'Help',
            'Fetching world data ...': 'Fetching world data ...',
            Rank: 'Rank',
            Player: 'Player',
            Villages: 'Villages',
            Points: 'Points',
            Action: 'Action',
            'Add as friend': 'Add as friend',
            'Auto-add friends': 'Auto-add friends',
            'Auto-adding enabled': 'Auto-adding enabled',
            'Auto-adding disabled': 'Auto-adding disabled',
            'There was an error fetching the friends list!':
                'There was an error fetching the friends list!',
            'Redirecting...': 'Redirecting...',
            'There was an error!': 'There was an error!',
            'Adding friends automatically...': 'Adding friends automatically...',
            'Finished adding friends!': 'Finished adding friends!',
        },
    },
    allowedMarkets: [],
    allowedScreens: ['buddies'],
    allowedModes: [],
    isDebug: DEBUG,
    enableCountApi: true,
};

$.getScript(
    `https://twscripts.dev/scripts/twSDK.js?url=${document.currentScript.src}`,
    async function () {
        // Initialize Library
        await twSDK.init(scriptConfig);
        const scriptInfo = twSDK.scriptInfo();
        const isValidScreen = twSDK.checkValidLocation('screen');
        
        // Global state
        let isAutoAddingEnabled = false;
        let isCurrentlyAdding = false;
        let addFriendLinks = [];
        let currentIndex = 0;

        if (isValidScreen) {
            try {
                initMain();
            } catch (error) {
                UI.ErrorMessage(twSDK.tt('There was an error!'));
                console.error(`${scriptInfo} Error:`, error);
            }
        } else {
            UI.InfoMessage(twSDK.tt('Redirecting...'));
            twSDK.redirectTo('buddies');
        }

        // Initialize main script logic
        async function initMain() {
            const players = await twSDK.worldDataAPI('player');
            const currentFriends = fetchCurrentFriendsList();

            // sort and filter
            const sortedPlayersByRank = players.sort((a, b) => a[5] - b[5]);
            const currentFriendIds = currentFriends.map((friend) =>
                parseInt(friend.id)
            );
            const filteredPlayers = sortedPlayersByRank.filter((player) =>
                player.push(currentFriendIds.includes(parseInt(player[0])))
            );

            const playersTable = buildPlayersTable(filteredPlayers);
            
            // Get all the add friend links for auto-adding
            addFriendLinks = filteredPlayers
                .filter(player => !player[6]) // Not existing friend
                .map(player => {
                    const [id] = player;
                    const hash = game_data.csrf;
                    return `/game.php?screen=info_player&id=${id}&action=add_friend&h=${hash}`;
                });

            const content = `
                <div class="ra-mb15">
                    <div class="ra-mb10">
                        <button id="btn-auto-add-friends" class="btn">
                            ${twSDK.tt('Auto-add friends')}
                        </button>
                        <span id="auto-add-status" style="margin-left: 10px; font-weight: bold;"></span>
                    </div>
                    <div class="ra-mh400">
                        ${playersTable}
                    </div>
                </div>
            `;

            const customStyle = `
                .ra-mh400 { overflow-y: auto; max-height: 400px; }
                .ra-existing-player td { background-color: #ffca6a !important; }
                .btn-confirm-yes { padding: 3px; }
                .ra-mb10 { margin-bottom: 10px; }
                .friend-added { background-color: #c1f1c1 !important; }
            `;

            twSDK.renderFixedWidget(
                content,
                'raFriendRequest',
                'ra-friend-request',
                customStyle,
                '560px'
            );

            // register action Handlers
            onClickAddFriend();
            onClickAutoAddFriends();
        }

        // Action Handler: Add to friend click handler
        function onClickAddFriend() {
            jQuery('.btn-add-friend').on('click', function () {
                const addFriendLink = jQuery(this).attr('data-href');
                const row = jQuery(this).closest('tr');
                
                jQuery(this).addClass('btn-confirm-yes');
                jQuery(this).attr('disabled', 'disabled');
                row.addClass('friend-added');
                
                jQuery.get(addFriendLink);
            });
        }
        
        // Action Handler: Auto-add friends click handler
        function onClickAutoAddFriends() {
            jQuery('#btn-auto-add-friends').on('click', function() {
                if (isCurrentlyAdding) return;
                
                isAutoAddingEnabled = !isAutoAddingEnabled;
                
                if (isAutoAddingEnabled) {
                    jQuery('#auto-add-status').text(twSDK.tt('Auto-adding enabled'));
                    UI.SuccessMessage(twSDK.tt('Adding friends automatically...'));
                    startAutoAddingFriends();
                } else {
                    jQuery('#auto-add-status').text(twSDK.tt('Auto-adding disabled'));
                    stopAutoAddingFriends();
                }
            });
        }
        
        // Helper: Start auto-adding friends process
        function startAutoAddingFriends() {
            if (!isAutoAddingEnabled || isCurrentlyAdding || currentIndex >= addFriendLinks.length) return;
            
            isCurrentlyAdding = true;
            processNextFriend();
        }
        
        // Helper: Stop auto-adding friends process
        function stopAutoAddingFriends() {
            isAutoAddingEnabled = false;
            isCurrentlyAdding = false;
        }
        
        // Helper: Process next friend in the queue
        function processNextFriend() {
            if (!isAutoAddingEnabled || currentIndex >= addFriendLinks.length) {
                isCurrentlyAdding = false;
                if (currentIndex >= addFriendLinks.length) {
                    UI.SuccessMessage(twSDK.tt('Finished adding friends!'));
                }
                return;
            }
            
            const link = addFriendLinks[currentIndex];
            currentIndex++;
            
            // Find and update the UI
            const btnElement = jQuery(`.btn-add-friend[data-href="${link}"]`);
            if (btnElement.length) {
                btnElement.addClass('btn-confirm-yes');
                btnElement.attr('disabled', 'disabled');
                btnElement.closest('tr').addClass('friend-added');
            }
            
            // Send the request
            jQuery.get(link);
            
            // Wait for the delay and process the next one
            setTimeout(() => {
                isCurrentlyAdding = false;
                processNextFriend();
            }, twSDK.delayBetweenRequests);
        }

        // Helper: Build the players table
        function buildPlayersTable(players) {
            let playersTable = `
                <table class="ra-table" width="100%">
                    <thead>
                        <tr>
                            <th>${twSDK.tt('Rank')}</th>
                            <th class="ra-tal">${twSDK.tt('Player')}</th>
                            <th>${twSDK.tt('Villages')}</th>
                            <th>${twSDK.tt('Points')}</th>
                            <th>${twSDK.tt('Action')}</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            players.forEach((player) => {
                const [id, name, ally, villages, points, rank, existing] =
                    player;
                const hash = game_data.csrf;
                if (name !== undefined && id) {
                    playersTable += `
                        <tr class="${existing ? 'ra-existing-player' : ''}">
                            <td>${rank}</td>
                            <td class="ra-tal">
                                <a href="/game.php?screen=info_player&id=${id}" target="_blank" rel="noopener noreferrer">
                                    ${twSDK.cleanString(name)}
                                </a>
                            </td>
                            <td>
                                ${twSDK.formatAsNumber(villages)}
                            </td>
                            <td>
                                ${twSDK.formatAsNumber(points)}
                            </td>
                            <td>
                                <span class="btn btn-add-friend ${
                                    existing ? 'btn-disabled' : ''
                                }" data-href="/game.php?screen=info_player&id=${id}&action=add_friend&h=${hash}">
                                    ${twSDK.tt('Add as friend')}
                                </span>
                            </td>
                        </tr>
                    `;
                }
            });

            playersTable += `</tbody></table>`;

            return playersTable;
        }

        // Helper: Get current friends list
        function fetchCurrentFriendsList() {
            const currentFriends = [];

            const currentFriendsTable = jQuery(
                '#content_value > table:nth-child(6) > tbody > tr'
            ).not(':eq(0)');
            const friendRequestsTable = jQuery(
                '#content_value > table:nth-child(8) > tbody > tr'
            ).not(':eq(0)');
            const incomingFriendsTable = jQuery(
                '#content_value > table:nth-child(10) > tbody > tr'
            ).not(':eq(0)');

            currentFriendsTable.each(function () {
                const playerName = jQuery(this).find('td:eq(1)').text().trim();
                const playerLink = jQuery(this).find('td:eq(1) a').attr('href');
                const playerId = twSDK.getParameterByName(
                    'id',
                    window.location.origin + playerLink
                );
                currentFriends.push({
                    id: parseInt(playerId),
                    name: playerName,
                });
            });

            friendRequestsTable.each(function () {
                const playerName = jQuery(this).find('td:eq(0)').text().trim();
                const playerLink = jQuery(this).find('td:eq(0) a').attr('href');
                const playerId = twSDK.getParameterByName(
                    'id',
                    window.location.origin + playerLink
                );
                currentFriends.push({
                    id: parseInt(playerId),
                    name: playerName,
                });
            });

            incomingFriendsTable.each(function () {
                const playerName = jQuery(this).find('td:eq(0)').text().trim();
                const playerLink = jQuery(this).find('td:eq(0) a').attr('href');
                const playerId = twSDK.getParameterByName(
                    'id',
                    window.location.origin + playerLink
                );
                currentFriends.push({
                    id: parseInt(playerId),
                    name: playerName,
                });
            });

            return currentFriends;
        }
    }
);