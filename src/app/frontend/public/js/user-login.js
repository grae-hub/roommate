// shared "does a user row exist for this email yet" flow — used in every environment
const loadingView = document.getElementById('loading-view');
const usernameView = document.getElementById('username-view');
const welcomeView = document.getElementById('welcome-view');
const newHouseView = document.getElementById('new-house-view');
const houseView = document.getElementById('house-view');
const welcome = document.getElementById('welcome');
const avatar = document.getElementById('avatar');
const form = document.getElementById('username-form');
const usernameInput = document.getElementById('username');
const usernameError = document.getElementById('username-error');
const usernameSubmit = document.getElementById('username-submit');
const housesHead = document.getElementById('houses-head');
const housesMessage = document.getElementById('houses-message');
const housesList = document.getElementById('houses-list');
const addHouse = document.getElementById('add-house');
const addHouseLink = document.getElementById('add-house-link');
const houseForm = document.getElementById('house-form');
const houseNameInput = document.getElementById('house-name');
const houseError = document.getElementById('house-error');
const houseSubmit = document.getElementById('house-submit');
const houseTitle = document.getElementById('house-title');
const houseMessage = document.getElementById('house-message');
const houseAdmins = document.getElementById('house-admins');
const houseUsers = document.getElementById('house-users');

// the signed-in user, once we know who they are
let currentUser = null;

function showView(view) {
    for (const v of [loadingView, usernameView, welcomeView, newHouseView, houseView]) {
        v.hidden = v !== view;
    }
}

// lists the user's houses as tiles; with no houses the dashed add button is all there is
function showHouses(user) {
    const email = user.user_email;
    housesMessage.hidden = true;
    housesHead.hidden = false;
    addHouseLink.hidden = true;
    addHouse.hidden = true;
    housesList.replaceChildren();
    fetch(`/api/users/${encodeURIComponent(email)}/houses`)
        .then((res) => res.json())
        .then((data) => {
            if (data.houses.length === 0) {
                housesHead.hidden = true;
                addHouse.hidden = false;
                return;
            }
            addHouseLink.hidden = false;
            for (const house of data.houses) {
                const tile = document.createElement('li');
                tile.className = 'tile';
                const head = document.createElement('div');
                head.className = 'tile-head';
                const link = document.createElement('a');
                link.href = `#/house/${house.house_id}`;
                const name = document.createElement('strong');
                name.textContent = house.house_name;
                link.append(name);
                head.append(link);
                if (user.administered_houses.includes(house.house_id)) {
                    const badge = document.createElement('span');
                    badge.className = 'badge';
                    badge.textContent = 'admin';
                    head.append(badge);
                }
                tile.append(head);
                housesList.append(tile);
            }
        })
        .catch(() => {
            housesMessage.textContent = "we couldn't load your houses, try refreshing.";
            housesMessage.hidden = false;
        });
}

function showWelcome() {
    const username = currentUser.user_name;
    const name = document.createElement('em');
    name.textContent = username;
    welcome.replaceChildren('welcome,', document.createElement('br'), name);
    avatar.textContent = username.charAt(0);
    showView(welcomeView);
    showHouses(currentUser);
}

// the form that asks for a unique house name and creates the house
function showNewHouse() {
    houseNameInput.value = '';
    houseError.textContent = '';
    showView(newHouseView);
    houseNameInput.focus();
}

houseForm.onsubmit = (event) => {
    event.preventDefault();
    const houseName = houseNameInput.value.trim();
    if (!houseName) {
        houseError.textContent = 'please enter a house name';
        return;
    }
    houseError.textContent = '';
    houseSubmit.disabled = true;
    // the api adds the creator as both a user and an admin of the new house
    fetch('/api/houses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ house_name: houseName, user_email: currentUser.user_email }),
    })
        .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
        .then(({ ok, body }) => {
            if (!ok) {
                houseError.textContent = body.error;
                return;
            }
            currentUser.houses.push(body.house_id);
            currentUser.administered_houses.push(body.house_id);
            location.hash = `#/house/${body.house_id}`;
        })
        .catch(() => { houseError.textContent = 'something went wrong, try again'; })
        .finally(() => { houseSubmit.disabled = false; });
};

function fillNames(list, users) {
    list.replaceChildren();
    for (const user of users) {
        const tile = document.createElement('li');
        tile.className = 'tile';
        const name = document.createElement('strong');
        name.textContent = user.user_name;
        tile.append(name);
        list.append(tile);
    }
}

// a house's name, admins and users
function showHouse(houseId) {
    houseTitle.textContent = '';
    houseMessage.hidden = true;
    houseAdmins.replaceChildren();
    houseUsers.replaceChildren();
    showView(houseView);
    Promise.all([
        fetch(`/api/houses/${houseId}`),
        fetch(`/api/houses/${houseId}/admins`),
        fetch(`/api/houses/${houseId}/users`),
    ])
        .then(async ([houseRes, adminsRes, usersRes]) => {
            if (!houseRes.ok) {
                houseTitle.textContent = 'not found';
                return;
            }
            const house = await houseRes.json();
            houseTitle.textContent = house.house_name;
            fillNames(houseAdmins, (await adminsRes.json()).users);
            fillNames(houseUsers, (await usersRes.json()).users);
        })
        .catch(() => {
            houseMessage.textContent = "we couldn't load this house, try refreshing.";
            houseMessage.hidden = false;
        });
}

// the url hash picks the page: none is home, #/new-house, #/house/<id>
function route() {
    if (!currentUser) return;
    const house = location.hash.match(/^#\/house\/(\d+)$/);
    if (location.hash === '#/new-house') {
        showNewHouse();
    } else if (house) {
        showHouse(Number(house[1]));
    } else {
        showWelcome();
    }
}

window.addEventListener('hashchange', route);

function startApp(user) {
    currentUser = user;
    route();
}

// checks the user db for this email; if there's no user yet, shows the username
// field and creates the user when it's submitted
function ensureUser(email) {
    fetch(`/api/users/${encodeURIComponent(email)}`).then((res) => {
        if (res.ok) {
            res.json().then((user) => startApp(user));
            return;
        }

        showView(usernameView);
        usernameInput.focus();
        form.onsubmit = (event) => {
            event.preventDefault();
            const username = usernameInput.value.trim();
            if (!username) {
                usernameError.textContent = 'please enter a username';
                return;
            }
            usernameError.textContent = '';
            usernameSubmit.disabled = true;
            fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: email, user_name: username }),
            })
                .then((created) => {
                    if (created.ok) {
                        created.json().then((user) => startApp(user));
                    } else {
                        created.json().then((err) => { usernameError.textContent = err.error; });
                    }
                })
                .catch(() => { usernameError.textContent = 'something went wrong, try again'; })
                .finally(() => { usernameSubmit.disabled = false; });
        };
    });
}

if (location.hostname !== 'localhost') {
    fetch('/api/whoami')
        .then((res) => res.json())
        .then((data) => ensureUser(data.email));
}
